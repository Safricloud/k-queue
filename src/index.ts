// src/index.ts
import { EventEmitter } from 'events';

type TaskStatus = 'pending' | 'active' | 'completed' | 'failed';

class Task extends EventEmitter {
    id: number;
    status: TaskStatus = 'pending';
    asyncFunction: (...args: any[]) => Promise<any>;
    args: any[];

    constructor(id: number, asyncFunction: (...args: any[]) => Promise<any>, args: any[]) {
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
        } catch (error) {
            this.status = 'failed';
            this.emit('failed', error);
            throw error;
        }
    }
}

class TaskQueue extends EventEmitter {
    private pendingTasks: Task[] = [];
    private activeTasks: Set<Task> = new Set();
    private concurrencyLimit: number;
    private haltOnFailure: boolean;
    private taskIdCounter: number = 0;
    private isPaused: boolean = false;

    constructor(concurrencyLimit: number = 5, haltOnFailure: boolean = false) {
        super();
        this.concurrencyLimit = concurrencyLimit;
        this.haltOnFailure = haltOnFailure;
    }

    addTask(asyncFunction: (...args: any[]) => Promise<any>, args: any[] = []): EventEmitter {
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

    private async processTasks() {
        if (this.isPaused) return;

        while (this.activeTasks.size < this.concurrencyLimit && this.pendingTasks.length > 0) {
            const task = this.pendingTasks.shift()!;
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
                    } else {
                        this.processTasks();
                    }
                });
        }
    }
}

export { TaskQueue, TaskStatus };