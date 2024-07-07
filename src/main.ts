import './style.css'
import { setupCounter } from './counter.js'
import { Change, next as A } from '@automerge/automerge'
import { BroadcastChannelNetworkAdapter } from '@automerge/automerge-repo-network-broadcastchannel';
import { Automerge } from "@automerge/automerge/dist/wasm_types";
import * as automerge from "@automerge/automerge"
import localforage from "localforage";

let counter = 0;

function increment() {
    counter+=1;
    document.getElementById("counter-display").innerHTML=String(counter);
}

(window as any).increment = increment;

interface TodoItem {
    text: string;
    done: boolean;
}

interface TodoDocument {
    items: TodoItem[];
}

let doc = automerge.init<TodoDocument>();

function addItem(text: string) {
    let newDoc = automerge.change(doc, (doc: TodoDocument) => {
        if (!doc.items) doc.items = [];
        doc.items.push({ text, done: false });
    });
    updateDoc(newDoc);
}

function toggleItem(i: number) {
    let newDoc = automerge.change(doc, (doc: TodoDocument) => {
        doc.items[i].done = !doc.items[i].done;
    });
    updateDoc(newDoc);
}

function updateDoc(newDoc: TodoDocument) {
    doc = newDoc;
    console.log(automerge.decodeChange(<Change>automerge.getLastLocalChange(newDoc)).ops);
    render(newDoc);
    save(newDoc);
    sync();
}

function render(doc: TodoDocument) {
    let list = document.querySelector("#todo-list") as HTMLUListElement;
    list.innerHTML = ``;
    doc.items && doc.items.forEach((item, index) => {
        let itemEl = document.createElement('li');
        itemEl.innerText = item.text;
        itemEl.style.textDecoration = item.done ? 'line-through' : '';
        itemEl.onclick = function () {
            toggleItem(index);
        };
        list.appendChild(itemEl);
    });
}

// Formular-Ereignislistener hinzufügen
let form = document.querySelector("form") as HTMLFormElement;
let input = document.querySelector("#new-todo") as HTMLInputElement;

form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (input.value.trim() !== "") {
        addItem(input.value.trim());
        input.value = "";
    }
});

// Speichern und laden
const docId = "my-todo-list"; //arbitrary name

async function loadDocument() {
    let binary = await localforage.getItem(docId);
    if (binary) {
        doc = automerge.load(binary);
        render(doc);
    }
}

function save(doc: TodoDocument) {
    let binary = automerge.save(doc);
    localforage.setItem(docId, binary);
}

//Synchronisieren zwischen Tabs
let channel = new BroadcastChannel(docId);
let lastSync = doc;

function sync() {
    let changes = automerge.getChanges(lastSync, doc);
    channel.postMessage(changes);
    lastSync = doc;
}

channel.onmessage = (ev) => {
    let [newDoc, patch] = automerge.applyChanges(doc, ev.data);
    doc = newDoc;
    render(newDoc);
}


// Initiales Rendern und Dokument laden
loadDocument();
render(doc);

