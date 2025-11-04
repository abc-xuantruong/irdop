import * as React from 'react';
const { createContext, useContext, useState, useCallback } = React;

const TaskQueueContext = createContext();

export const useTaskQueue = () => {
	const context = useContext(TaskQueueContext);
	if (!context) {
		throw new Error('useTaskQueue must be used within TaskQueueProvider');
	}
	return context;
};

export const TaskQueueProvider = ({ children }) => {
	const [taskQueue, setTaskQueue] = useState([]);
	const [queueMinimized, setQueueMinimized] = useState(false);

	// Add a new task to the queue
	const addTask = useCallback((type, protocolId = null, protocolName = '', fileName = '') => {
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
		};
		setTaskQueue((prev) => [newTask, ...prev]);
		return taskId;
	}, []);

	// Update an existing task
	const updateTask = useCallback((taskId, updates) => {
		setTaskQueue((prev) => prev.map((task) => (task.id === taskId ? { ...task, ...updates } : task)));
	}, []);

	// Remove a task from the queue
	const removeTask = useCallback((taskId) => {
		setTaskQueue((prev) => prev.filter((task) => task.id !== taskId));
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
