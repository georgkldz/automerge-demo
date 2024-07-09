import "./style.css";
import { Counter } from '@automerge/automerge';
import { DocHandle, Repo, isValidAutomergeUrl } from "@automerge/automerge-repo";
import { IndexedDBStorageAdapter } from '@automerge/automerge-repo-storage-indexeddb';
import { BroadcastChannelNetworkAdapter } from '@automerge/automerge-repo-network-broadcastchannel';

// Definieren der Schnittstellen für die Dokumente
interface CounterDoc {
    buttonClicks?: Counter;
}

interface TodoItem {
    text: string;
    done: boolean;
}

interface TodoDocument {
    items: TodoItem[];
}

// Erstellen eines Repos mit dem IndexedDBStorageAdapter und BroadcastChannelNetworkAdapter
const storageAdapter = new IndexedDBStorageAdapter();
const networkAdapter = new BroadcastChannelNetworkAdapter();

const repo = new Repo({
    storage: storageAdapter,
    network: [networkAdapter],
});

// Initialisieren oder Laden des Dokuments
const docUrl = window.location.hash.slice(1);
let handle: DocHandle<CounterDoc & TodoDocument>;

if (docUrl && isValidAutomergeUrl(docUrl)) {
    handle = repo.find<CounterDoc & TodoDocument>(docUrl as any); // Cast to any to match the expected type
} else {
    handle = repo.create<CounterDoc & TodoDocument>();
    window.location.hash = handle.url;
}

// Funktion zum Aktualisieren des Displays
function updateDisplay(counterValue: number) {
    const counterDisplayElement = document.getElementById("counter-display");
    if (counterDisplayElement) {
        counterDisplayElement.innerHTML = String(counterValue);
    }
}

// Initialisieren des Counters im Dokument
async function initCounter() {
    await handle.whenReady();

    handle.change((doc) => {
        if (!doc.buttonClicks) {
            doc.buttonClicks = new Counter();
        }
    });

    const doc = await handle.doc();
    if (doc && doc.buttonClicks) {
        updateDisplay(doc.buttonClicks.value);
    }

    handle.on('change', (d) => {
        if (d.doc.buttonClicks) {
            updateDisplay(d.doc.buttonClicks.value);
        }
    });

    (window as any).increment = () => {
        handle.change((doc) => {
            if (doc.buttonClicks) {
                doc.buttonClicks.increment();
            }
        });
    };
}

initCounter().catch(console.error);

// TODO-App Initialisierung
const todoForm = document.getElementById("todo-form") as HTMLFormElement;
const newTodoInput = document.getElementById("new-todo") as HTMLInputElement;
const todoList = document.getElementById("todo-list") as HTMLUListElement;

function renderTodoList(doc: TodoDocument) {
    todoList.innerHTML = '';
    doc.items.forEach((item, index) => {
        const li = document.createElement("li");
        li.textContent = item.text;
        li.style.textDecoration = item.done ? 'line-through' : 'none';
        li.addEventListener("click", () => {
            handle.change((doc) => {
                if (doc.items && doc.items[index]) {
                    doc.items[index].done = !doc.items[index].done;
                }
            });
        });
        todoList.appendChild(li);
    });
}

async function initTodoApp() {
    await handle.whenReady();

    handle.change((doc) => {
        if (!doc.items) {
            doc.items = [];
        }
    });

    const doc = await handle.doc() as TodoDocument;
    renderTodoList(doc);

    handle.on('change', (d) => {
        const doc = d.doc as TodoDocument;
        renderTodoList(doc);
    });

    todoForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const newTodoText = newTodoInput.value.trim();
        if (newTodoText) {
            handle.change((doc) => {
                if (doc.items) {
                    doc.items.push({ text: newTodoText, done: false });
                }
            });
            newTodoInput.value = '';
        }
    });
}

initTodoApp().catch(console.error);
