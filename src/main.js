import { EditorView, basicSetup } from "codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { oneDark } from "@codemirror/theme-one-dark";
import { EditorState, Prec } from "@codemirror/state";
import { yCollab } from "y-codemirror.next";
import { Session } from "@flok-editor/session";
import { flashField, evalKeymap, remoteEvalFlash } from "@flok-editor/cm-eval";
import { UndoManager } from "yjs";
import { StrudelSession } from "./strudel";

import "./style.css";

const onError = (err) => {
  console.error(err);
};

const strudel = new StrudelSession({ onError });

const flokBasicSetup = (doc) => {
  const text = doc.getText();
  const undoManager = new UndoManager(text);
  const web = true;

  return [
    flashField(),
    remoteEvalFlash(doc),
    Prec.high(evalKeymap(doc, { web, defaultMode: "document" })),
    yCollab(text, doc.session.awareness, { undoManager }),
  ];
};

const createEditor = (doc) => {
  console.log("createEditor", doc);
  if (!["slot1", "slot2"].includes(doc.id)) {
    console.warn(
      `ignoring doc with id "${doc.id}". only slot1 and slot2 is allowed rn..`
    );
    return;
  }
  const state = EditorState.create({
    doc: doc.content,
    extensions: [
      basicSetup,
      flokBasicSetup(doc),
      javascript(),
      EditorView.lineWrapping,
      oneDark,
    ],
  });

  const editorEl = document.querySelector(`#${doc.id} .editor`);
  const view = new EditorView({
    state,
    parent: editorEl,
  });

  const targetEl = document.querySelector(`#${doc.id} .target`);
  targetEl.value = doc.target;

  targetEl.addEventListener("change", (e) => {
    doc.target = e.target.value;
  });
  doc.session.on(`change-target:${doc.id}`, () => {
    targetEl.value = doc.target;
  });

  return [state, view];
};

const handleEvalHydra = (msg) => {
  console.log("eval:hydra", msg);
  // evaluate hydra code here...
};

const session = new Session("default", {
  // changed this part to what flok.cc uses
  hostname: "flok.cc",
  port: "", //parseInt(port),
  isSecure: true,
});
window.session = session;

session.on("change", (...args) => console.log("change", ...args));
session.on("message", (msg) => console.log("message", msg));
session.on("eval:hydra", handleEvalHydra);
session.on("eval:strudel", (msg) => strudel.eval(msg));

session.on("sync", () => {
  // If session is empty, create two documents
  if (session.getDocuments().length === 0) {
    session.setActiveDocuments([
      { id: "slot1", target: "strudel" },
      { id: "slot2", target: "hydra" },
    ]);
  }

  // Create editors for each document
  session.getDocuments().map((doc) => createEditor(doc));
});

session.initialize();
