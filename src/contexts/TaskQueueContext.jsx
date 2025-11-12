import * as React from 'react';
const { createContext, useContext, useState, useCallback, useEffect } = React;

const TaskQueueContext = createContext();

const STORAGE_KEY = 'irdop_taskQueue';
const MINIMIZE_KEY = 'irdop_queueMinimized';

export const useTaskQueue = () => {
	const context = useContext(TaskQueueContext);
	if (!context) {
		throw new Error('useTaskQueue must be used within TaskQueueProvider');
	}
	return context;
};

// Helper function to load queue from localStorage
const loadQueueFromStorage = () => {
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			const parsed = JSON.parse(stored);
			// Convert timestamp strings back to Date objects
			return parsed.map((task) => ({
				...task,
				timestamp: new Date(task.timestamp),
			}));
		}
	} catch (error) {
		console.error('Error loading queue from localStorage:', error);
	}
	return [];
};

// Helper function to save queue to localStorage
const saveQueueToStorage = (queue) => {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
	} catch (error) {
		console.error('Error saving queue to localStorage:', error);
	}
};

export const TaskQueueProvider = ({ children }) => {
	const [taskQueue, setTaskQueue] = useState(() => loadQueueFromStorage());
	const [queueMinimized, setQueueMinimized] = useState(() => {
		const stored = localStorage.getItem(MINIMIZE_KEY);
		return stored ? JSON.parse(stored) : false;
	});

	// Sync taskQueue to localStorage whenever it changes
	useEffect(() => {
		saveQueueToStorage(taskQueue);
	}, [taskQueue]);

	// Sync queueMinimized to localStorage whenever it changes
	useEffect(() => {
		localStorage.setItem(MINIMIZE_KEY, JSON.stringify(queueMinimized));
	}, [queueMinimized]);

	// Add a new task to the queue
	const addTask = useCallback(
		(type, protocolId = null, protocolName = '', fileName = '', sourceComponent = 'protocol') => {
			const taskId = `${type}-${protocolId || 'new'}-${Date.now()}`;
			const newTask = {
				id: taskId,
				type,
				status: 'processing',
				protocolId,
				protocolName: protocolName || fileName || 'Unknown',
				fileName,
				data: null,
				error: null,
				timestamp: new Date(),
				sourceComponent, // 'protocol' or 'file'
			};
			setTaskQueue((prev) => {
				const newQueue = [newTask, ...prev];
				return newQueue;
			});
			return taskId;
		},
		[],
	);

	// Update an existing task
	const updateTask = useCallback((taskId, updates) => {
		setTaskQueue((prev) => {
			const newQueue = prev.map((task) => (task.id === taskId ? { ...task, ...updates } : task));
			return newQueue;
		});
	}, []);

	// Remove a task from the queue
	const removeTask = useCallback((taskId) => {
		setTaskQueue((prev) => {
			const newQueue = prev.filter((task) => task.id !== taskId);
			return newQueue;
		});
	}, []);

	// Clear all tasks
	const clearAllTasks = useCallback(() => {
		setTaskQueue([]);
	}, []);

	// Toggle minimize state
	const toggleMinimize = useCallback(() => {
		setQueueMinimized((prev) => !prev);
	}, []);

	const value = {
		taskQueue,
		queueMinimized,
		addTask,
		updateTask,
		removeTask,
		clearAllTasks,
		toggleMinimize,
		setQueueMinimized,
	};

	return <TaskQueueContext.Provider value={value}>{children}</TaskQueueContext.Provider>;
};
