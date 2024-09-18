# k-queue
 Event based queueing with concurency limits.

The `TaskQueue` offers fine-grained control over task processing by allowing concurrent execution of tasks with a configurable limit. It also emits events on task status changes, so you can easily react to different stages of task execution.

## Features

- **Task Status Tracking**: Tasks can have four statuses:
    - `pending`: Task is waiting to be executed.
    - `active`: Task is currently running.
    - `completed`: Task finished successfully.
    - `failed`: Task encountered an error during execution.
  
- **Concurrency Control**: You can define how many tasks can run concurrently. This helps manage resource consumption efficiently.

- **Halt on Failure**: The queue can be configured to stop processing when a task fails and throw an error (`haltOnFailure` flag).

- **Event-Based Notification**: Each task emits status-change events (`pending`, `active`, `completed`, `failed`). The `completed` event passes the resolved data, and the `failed` event includes the error.

- **Flexible Task Addition**: Tasks can be added dynamically as async functions with custom arguments.

## Installation

```bash

npm install task-queue
```
or

```bash

yarn add task-queue
```
Usage
Import the Queue

```typescript

import { TaskQueue } from 'task-queue';
```
Create a TaskQueue Instance

You can specify the concurrency limit (default: 5) and whether to halt on failure (default: false).

```typescript

const queue = new TaskQueue(3, true);
```
    concurrencyLimit: Sets how many tasks can run concurrently.
    haltOnFailure: If set to true, the queue will stop executing tasks after the first failure and emit an error event.

Add Tasks to the Queue

You can add any async function with arguments to the queue. Each task emits events as it progresses through different statuses.

```typescript

const taskListener = queue.addTask(
  async (x: number, y: number) => {
    return x + y;
  },
  [2, 3]  // Arguments for the async function
);
```
Subscribe to Task Events

Each task returns an EventEmitter that allows you to track its progress:

```typescript

taskListener.on('pending', () => {
  console.log('Task is pending');
});

taskListener.on('active', () => {
  console.log('Task is active');
});

taskListener.on('completed', (result) => {
  console.log('Task completed with result:', result);
});

taskListener.on('failed', (error) => {
  console.log('Task failed with error:', error);
});
```
Handle Queue-Wide Errors

If the haltOnFailure flag is true, the queue will stop on the first failure and emit an error event:

```typescript

queue.on('error', (error) => {
  console.error('Queue halted due to error:', error);
});
```
Full Example

```typescript

import { TaskQueue } from 'task-queue';

const queue = new TaskQueue(3, true);

// Async function to simulate work
const asyncTask = async (duration: number) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() < 0.2) {
        reject('Task failed');
      } else {
        resolve(`Completed after ${duration}ms`);
      }
    }, duration);
  });
};

const task1 = queue.addTask(asyncTask, [1000]);
const task2 = queue.addTask(asyncTask, [1500]);
const task3 = queue.addTask(asyncTask, [500]);

// Listen to task events
task1.on('completed', (result) => console.log(result));
task1.on('failed', (error) => console.error(error));

// Listen for queue-wide errors
queue.on('error', (error) => console.error('Queue halted due to error:', error));
```
Options

    Concurrency: Control the number of concurrent tasks by passing the concurrency limit when instantiating the TaskQueue. For example, new TaskQueue(3) will ensure that only three tasks run at any given time.

    Halt on Failure: When set to true, if a task fails, no further tasks will be processed, and the error will be emitted by the queue.

Contributing

Feel free to submit issues or open pull requests with improvements.

    Fork the repository
    Create a feature branch (git checkout -b feature/new-feature)
    Commit your changes (git commit -m 'Add new feature')
    Push to the branch (git push origin feature/new-feature)
    Open a pull request

License

MIT License. See the LICENSE file for more information.