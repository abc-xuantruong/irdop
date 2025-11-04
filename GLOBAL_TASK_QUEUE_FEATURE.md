# Global Task Queue Feature

## Overview

The task queue system has been moved to a global context, making it accessible across all routes in the application. This allows users to navigate between pages while background tasks (extract/upload operations) continue processing.

## Changes Made

### 1. Created TaskQueueContext (`src/contexts/TaskQueueContext.jsx`)

- **Purpose**: Global state management for task queue
- **Exports**:

  - `TaskQueueProvider`: Context provider component
  - `useTaskQueue`: Custom hook to access queue functionality

- **State**:

  - `taskQueue`: Array of tasks
  - `queueMinimized`: Boolean for UI state

- **Methods**:

  - `addTask(type, protocolId, protocolName, fileName)`: Add a new task to the queue
  - `updateTask(taskId, updates)`: Update task properties
  - `removeTask(taskId)`: Remove a task from queue
  - `clearAllTasks()`: Remove all tasks
  - `toggleMinimize()`: Toggle minimized state

- **Task Structure**:

```javascript
{
  id: string,           // Unique identifier
  type: string,         // 'extract' | 'upload'
  status: string,       // 'processing' | 'completed' | 'failed'
  protocolId: number,   // Protocol ID
  protocolName: string, // Display name
  fileName: string,     // File name (for uploads)
  data: object,         // Result data
  error: string,        // Error message
  timestamp: Date       // Creation time
}
```

### 2. Created ProcessingQueue Component (`src/components/ProcessingQueue.jsx`)

- **Purpose**: Standalone UI component for displaying the task queue
- **Features**:

  - **Minimized View**: Compact button with task count and spinner
  - **Expanded View**: Full panel with scrollable task list
  - **Navigation**: Clicking completed extract tasks navigates to `/library/protocol` with state to open the protocol modal
  - **Task Management**: Individual task removal and clear all functionality

- **UI States**:
  - Processing: Blue background with spinner
  - Completed: Green checkmark, clickable
  - Failed: Red X with error message

### 3. Updated App.jsx

- **Added Imports**:

  - `TaskQueueProvider` from TaskQueueContext
  - `ProcessingQueue` component

- **Component Structure**:

```jsx
<TaskQueueProvider>
	<Router>
		<AuthGuard>
			<ProcessingQueue />
			<Routes>{/* All routes */}</Routes>
		</AuthGuard>
	</Router>
</TaskQueueProvider>
```

- **Why This Structure**:
  - `TaskQueueProvider` wraps everything to provide global state
  - `ProcessingQueue` is inside `AuthGuard` but outside `Routes` so it's visible on all authenticated routes
  - Queue persists during navigation between pages

### 4. Updated ProtocolInfor.jsx

- **Added Imports**:

  - `useTaskQueue` hook
  - `useLocation` from react-router-dom

- **Removed**:

  - Local `taskQueue` and `queueMinimized` state
  - Local `addTask`, `updateTask`, `removeTask` functions
  - Local `handleTaskClick` function
  - Entire task queue UI rendering code (moved to ProcessingQueue component)

- **Added**:
  - `useTaskQueue()` hook to access global queue methods
  - Navigation state handler with `useEffect`:

```javascript
useEffect(() => {
	if (location.state?.openProtocol && location.state?.protocolData) {
		setSelectedProtocol(location.state.protocolData);
		setEditedProtocol(location.state.protocolData);
		setIsEditMode(location.state.openInEditMode || false);
		setDetailModalVisible(true);
		window.history.replaceState({}, document.title);
	}
}, [location.state]);
```

## How It Works

### Task Creation Flow

1. User uploads a file or clicks re-extract
2. `ProtocolInfor` calls `addTask()` from the global context
3. Modal closes immediately
4. Task appears in the global `ProcessingQueue` component
5. Background processing continues

### Navigation Flow

1. User clicks a completed extract task in the queue
2. `ProcessingQueue` calls `navigate('/library/protocol', { state: { ... } })`
3. User is navigated to protocol page
4. `ProtocolInfor` detects navigation state in `useEffect`
5. Modal opens automatically with the extracted data

### Cross-Route Persistence

- Queue is now part of global context, not tied to any specific page
- Tasks remain visible when navigating between:
  - Dashboard → Protocol Library
  - Sample Management → Protocol Library
  - Any authenticated route

## Benefits

1. **Non-blocking UI**: Users can navigate while tasks process
2. **Global Visibility**: Queue visible across all pages
3. **Better UX**: No need to stay on one page during long operations
4. **Clean Separation**: UI component separate from business logic
5. **Reusable**: Other components can use `useTaskQueue` to add tasks

## Usage in Other Components

To add task queue functionality to other components:

```javascript
import { useTaskQueue } from '../contexts/TaskQueueContext';

function MyComponent() {
	const { addTask, updateTask, removeTask } = useTaskQueue();

	const handleLongOperation = async () => {
		const taskId = addTask('extract', protocolId, 'Protocol Name');

		try {
			const result = await apiCall();
			updateTask(taskId, {
				status: 'completed',
				data: result,
			});
		} catch (error) {
			updateTask(taskId, {
				status: 'failed',
				error: error.message,
			});
		}
	};
}
```

## Files Modified

1. ✅ `src/contexts/TaskQueueContext.jsx` (new)
2. ✅ `src/components/ProcessingQueue.jsx` (new)
3. ✅ `src/App.jsx` (updated)
4. ✅ `src/components/ProtocolInfor.jsx` (refactored)

## Testing Checklist

- [ ] Upload a file from Protocol Library page
- [ ] Navigate to Dashboard while upload is processing
- [ ] Verify queue is still visible on Dashboard
- [ ] Navigate back to Protocol Library
- [ ] Click completed task in queue
- [ ] Verify protocol modal opens with extracted data
- [ ] Test re-extract functionality
- [ ] Test minimize/expand queue UI
- [ ] Test clear all tasks
- [ ] Test individual task removal
