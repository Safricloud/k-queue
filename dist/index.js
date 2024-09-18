// src/index.ts
import { EventEmitter } from 'events';
class Task extends EventEmitter {
    id;
    status = 'pending';
    asyncFunction;
    args;
    constructor(id, asyncFunction, args) {
        super();
        this.id = id;
        this.asyncFunction = asyncFunction;
        this.args = args;
    }
    async run() {
        this.status = 'active';
        this.emit('active');
        try {
            const result = await this.asyncFunction(...this.args);
            this.status = 'completed';
            this.emit('completed', result);
            return result;
        }
        catch (error) {
            this.status = 'failed';
            this.emit('failed', error);
            throw error;
        }
    }
}
class TaskQueue extends EventEmitter {
    pendingTasks = [];
    activeTasks = new Set();
    concurrencyLimit;
    haltOnFailure;
    taskIdCounter = 0;
    isPaused = false;
    constructor(concurrencyLimit = 5, haltOnFailure = false) {
        super();
        this.concurrencyLimit = concurrencyLimit;
        this.haltOnFailure = haltOnFailure;
    }
    addTask(asyncFunction, args = []) {
        const taskId = this.taskIdCounter++;
        const task = new Task(taskId, asyncFunction, args);
        this.pendingTasks.push(task);
        // Defer emitting 'pending' until after the task is returned so that 
        // the event doesn't get emitted before the caller can attach a listener
        process.nextTick(() => {
            task.status = 'pending';
            task.emit('pending');
            this.processTasks();
        });
        return task;
    }
    async processTasks() {
        if (this.isPaused)
            return;
        while (this.activeTasks.size < this.concurrencyLimit && this.pendingTasks.length > 0) {
            const task = this.pendingTasks.shift();
            this.activeTasks.add(task);
            task.run()
                .then(() => {
                this.activeTasks.delete(task);
                this.processTasks();
            })
                .catch((error) => {
                this.activeTasks.delete(task);
                if (this.haltOnFailure) {
                    this.isPaused = true;
                    this.emit('error', error);
                }
                else {
                    this.processTasks();
                }
            });
        }
    }
}
export { TaskQueue };
