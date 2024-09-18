import { EventEmitter } from 'events';
type TaskStatus = 'pending' | 'active' | 'completed' | 'failed';
declare class TaskQueue extends EventEmitter {
    private pendingTasks;
    private activeTasks;
    private concurrencyLimit;
    private haltOnFailure;
    private taskIdCounter;
    private isPaused;
    constructor(concurrencyLimit?: number, haltOnFailure?: boolean);
    addTask(asyncFunction: (...args: any[]) => Promise<any>, args?: any[]): EventEmitter;
    private processTasks;
}
export { TaskQueue, TaskStatus };
