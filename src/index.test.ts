// src/index.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TaskQueue } from './index.js';
import { EventEmitter } from 'events';

test.describe('TaskQueue Tests', () => {
    test('TaskQueue processes tasks up to concurrency limit', async () => {
        const concurrencyLimit = 2;
        const taskQueue = new TaskQueue(concurrencyLimit);

        let activeTaskCount = 0;
        let maxActiveTaskCount = 0;

        const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

        const tasks: Promise<void>[] = [];

        for (let i = 0; i < 5; i++) {
            const task = taskQueue.addTask(async () => {
                activeTaskCount++;
                maxActiveTaskCount = Math.max(maxActiveTaskCount, activeTaskCount);
                await sleep(100);
                activeTaskCount--;
            });
            tasks.push(
                new Promise<void>((resolve, reject) => {
                    task.on('completed', resolve);
                    task.on('failed', reject);
                })
            );
        }

        await Promise.all(tasks);
        assert.equal(maxActiveTaskCount, concurrencyLimit);
    });

    test('Tasks are completed successfully', async () => {
        const taskQueue = new TaskQueue();

        const tasks: Promise<number>[] = [];

        for (let i = 0; i < 3; i++) {
            const task = taskQueue.addTask(async (x: number) => x * 2, [i]);
            tasks.push(
                new Promise<number>((resolve, reject) => {
                    task.on('completed', (result: number) => resolve(result));
                    task.on('failed', reject);
                })
            );
        }

        const results = await Promise.all(tasks);
        assert.deepEqual(results, [0, 2, 4]);
    });

    test('TaskQueue halts on failure when haltOnFailure is true', async () => {
        const taskQueue = new TaskQueue(1, true); // Set concurrencyLimit to 1

        let tasksProcessed = 0;

        const tasks: Promise<void>[] = [];

        const failingTask = taskQueue.addTask(async () => {
            tasksProcessed++;
            throw new Error('Task failed');
        });
        tasks.push(
            new Promise<void>((resolve, reject) => {
                failingTask.on('completed', resolve);
                failingTask.on('failed', reject);
            })
        );

        for (let i = 0; i < 2; i++) {
            const task = taskQueue.addTask(async () => {
                tasksProcessed++;
            });
            tasks.push(
                new Promise<void>((resolve, reject) => {
                    task.on('completed', resolve);
                    task.on('failed', reject);
                })
            );
        }

        try {
            await Promise.all(tasks);
            assert.fail('Expected tasks to fail');
        } catch (error) {
            assert.equal(tasksProcessed, 1, 'Only one task should have been processed');
        }
    });

    test('TaskQueue continues after failure when haltOnFailure is false', async () => {
        const taskQueue = new TaskQueue(5, false);

        let tasksProcessed = 0;

        const tasks: Promise<void>[] = [];

        const failingTask = taskQueue.addTask(async () => {
            tasksProcessed++;
            throw new Error('Task failed');
        });
        tasks.push(
            new Promise<void>((resolve, reject) => {
                failingTask.on('completed', resolve);
                failingTask.on('failed', reject);
            })
        );

        for (let i = 0; i < 2; i++) {
            const task = taskQueue.addTask(async () => {
                tasksProcessed++;
            });
            tasks.push(
                new Promise<void>((resolve, reject) => {
                    task.on('completed', resolve);
                    task.on('failed', reject);
                })
            );
        }

        try {
            await Promise.all(tasks);
        } catch (error) {
            // Ignore errors
        }
        assert.equal(tasksProcessed, 3, 'All tasks should have been processed');
    });

    test('Task emits correct events', async () => {
        const taskQueue = new TaskQueue();

        const task = taskQueue.addTask(async (x: number) => x * 2, [5]);

        const events: string[] = [];

        task.on('pending', () => events.push('pending'));
        task.on('active', () => events.push('active'));
        task.on('completed', () => events.push('completed'));

        await new Promise<void>((resolve, reject) => {
            task.on('completed', resolve);
            task.on('failed', reject);
        });

        assert.deepEqual(events, ['pending', 'active', 'completed']);
    });
});
