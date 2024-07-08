import './style.css'
import { setupCounter } from './counter.js'
import {Change, next as A} from '@automerge/automerge'
import { BroadcastChannelNetworkAdapter } from '@automerge/automerge-repo-network-broadcastchannel';
import { Automerge } from "@automerge/automerge/dist/wasm_types";
import * as automerge from "@automerge/automerge"
import localforage from "localforage";
import {Repo, isValidAutomergeUrl} from "@automerge/automerge-repo"
import { IndexedDBStorageAdapter } from "@automerge/automerge-repo-storage-indexeddb"

const repo = new Repo({
    storage: new IndexedDBStorageAdapter("automerge"),
    network: [new BroadcastChannelNetworkAdapter()],
})

// Beispiel-Dokument erstellen oder finden
const docUrl = window.location.hash.slice(1);
let handle;
if (docUrl && isValidAutomergeUrl(docUrl)) {
    handle = repo.find(docUrl);
} else {
    handle = repo.create<TodoDocument>();
    window.location.hash = handle.url;
}

// Warten, bis das Handle verfügbar ist
handle.whenReady().then(() => {
    console.log('Document is ready:', handle.document);

    // Ausgabe der URL des Handles
    console.log('Document URL:', handle.url);
});

let doc = automerge.init<TodoDocument>()

interface TodoItem {
    text: string;
    done: boolean;
}

interface TodoDocument {
    items: TodoItem[];
}

function addItem(text: string) {
    let newDoc = automerge.change(doc, (doc: TodoDocument) => {
        if (!doc.items) doc.items = [];
        doc.items.push({ text, done: false });
    })
    updateDoc(newDoc)
}

function toggleItem(i: number) {
    let newDoc = automerge.change(doc, (doc: TodoDocument) => {
        doc.items[i].done = !doc.items[i].done;
    })
    updateDoc(newDoc)
}

function updateDoc(newDoc: TodoDocument) {
    doc = newDoc;
    console.log(automerge.decodeChange(<Change>automerge.getLastLocalChange(newDoc)).ops)
    render(newDoc);
    save(newDoc)
    sync()
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
        }
        list.appendChild(itemEl);
    })
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

let docId = "my-todo-list" //arbitrary name
let binary = await localforage.getItem(docId)
if (binary) {
    doc = automerge.load(binary)
    render(doc)
}

function save(doc: TodoDocument) {
    let binary = automerge.save(doc)
    localforage.setItem(docId, binary)
}

//Synchronisieren zwischen Tabs
let channel = new BroadcastChannel(docId)
let lastSync = doc

function sync() {
    let changes = automerge.getChanges(lastSync, doc)
    channel.postMessage(changes)
    lastSync = doc
}

channel.onmessage = (ev) => {
    let [newDoc, patch] = automerge.applyChanges(doc, ev.data)
    doc = newDoc
    render(newDoc)
}

//dies geht automatisch mit updateDoc
// aber zunächst mit einem Button
/*
let button = document.createElement("button")
button.innerText = "Transmit changes"
button.onclick = () => sync()
document.body.appendChild(button)
*/

// Initiales Rendern
render(doc);
