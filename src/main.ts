import "./style.css"
import { Counter } from '@automerge/automerge';
import { DocHandle, Repo, isValidAutomergeUrl } from "@automerge/automerge-repo"
import { IndexedDBStorageAdapter } from '@automerge/automerge-repo-storage-indexeddb';
import { BroadcastChannelNetworkAdapter } from '@automerge/automerge-repo-network-broadcastchannel';
import { next as A } from "@automerge/automerge";


// Definieren der Schnittstelle für das Dokument
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
let handle: DocHandle<CounterDoc>;

if (docUrl && isValidAutomergeUrl(docUrl)) {
    handle = repo.find<CounterDoc>(docUrl as any); // Cast to any to match the expected type
} else {
    handle = repo.create<CounterDoc>();
    window.location.hash = handle.url;
}
// Warten, bis das Handle verfügbar ist
await handle.whenReady().then(() => {
    console.log('Document is ready:', handle.doc);

    // Ausgabe der URL des Handles
    console.log('Document URL:', handle.url);
});


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

