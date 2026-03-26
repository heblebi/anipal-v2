/**
 * Simple async queue with concurrency control.
 * Allows at most `concurrency` tasks running at the same time.
 */
class AsyncQueue {
    constructor(concurrency = 2) {
        this.concurrency = concurrency;
        this.running = 0;
        this.pending = [];
    }

    add(fn) {
        return new Promise((resolve, reject) => {
            this.pending.push({ fn, resolve, reject });
            this._run();
        });
    }

    _run() {
        while (this.running < this.concurrency && this.pending.length > 0) {
            const { fn, resolve, reject } = this.pending.shift();
            this.running++;
            Promise.resolve()
                .then(() => fn())
                .then(result => { this.running--; resolve(result); this._run(); })
                .catch(err => { this.running--; reject(err); this._run(); });
        }
    }

    get size() { return this.pending.length; }
    get activeCount() { return this.running; }
}

// Shared queue — max 2 concurrent Puppeteer pages
const queue = new AsyncQueue(2);

module.exports = queue;
