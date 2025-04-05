import * as React from "react"; 
import type { ToastActionElement, ToastProps } from "@/components/ui/toast"; 

const TOAST_LIMIT = 1; 
const TOAST_REMOVE_DELAY = 1000000; 

// Extended Toast type with additional properties
type ToasterToast = ToastProps & {
  id: string; 
  title?: React.ReactNode; 
  description?: React.ReactNode; 
  action?: ToastActionElement;
};

// Action types for managing toasts
const actionTypes = {
  ADD_TOAST: "ADD_TOAST", 
  UPDATE_TOAST: "UPDATE_TOAST", 
  DISMISS_TOAST: "DISMISS_TOAST", 
  REMOVE_TOAST: "REMOVE_TOAST", 
} as const;

let count = 0; 

// Function to generate a unique toast ID
function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER; 
  return count.toString(); 
}

// Define action types and actions for the reducer
type ActionType = typeof actionTypes;

type Action =
  | {
      type: ActionType["ADD_TOAST"];
      toast: ToasterToast; 
    }
  | {
      type: ActionType["UPDATE_TOAST"];
      toast: Partial<ToasterToast>; 
    }
  | {
      type: ActionType["DISMISS_TOAST"];
      toastId?: ToasterToast["id"]; 
    }
  | {
      type: ActionType["REMOVE_TOAST"];
      toastId?: ToasterToast["id"]; 
    };

// State interface for the toast system
interface State {
  toasts: ToasterToast[]; // Array of active toasts
}

// Map to store timeouts for toast removal
const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

// Function to add a toast to the removal queue
const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) {
    return; 
  }

  // Set a timeout to remove the toast after the delay
  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId); 
    dispatch({
      type: "REMOVE_TOAST",
      toastId: toastId, 
    });
  }, TOAST_REMOVE_DELAY);

  toastTimeouts.set(toastId, timeout); 
};

// Reducer function to manage toast state
export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT), 
      };

    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t 
        ),
      };
      };

    case "DISMISS_TOAST": {
      const { toastId } = action;

      // Add the toast(s) to the removal queue
      if (toastId) {
        addToRemoveQueue(toastId); 
      } else {
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id); 
        });
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false, 
              }
            : t
        ),
      };
      };
    }
    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [], 
        };
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId), 
      };
  }
};
};

// Array of listeners for state changes
const listeners: Array<(state: State) => void> = [];

// In-memory state for the toast system
let memoryState: State = { toasts: [] };

// Function to dispatch actions and update state
function dispatch(action: Action) {
  memoryState = reducer(memoryState, action); 
  listeners.forEach((listener) => {
    listener(memoryState); 
  });
}

// Toast type without the `id` property (used for creating new toasts)
type Toast = Omit<ToasterToast, "id">;

// Function to create and display a toast
function toast({ ...props }: Toast) {
  const id = genId(); 

  // Function to update the toast
  const update = (props: ToasterToast) =>
    dispatch({
      type: "UPDATE_TOAST",
      toast: { ...props, id },
    });

  // Function to dismiss the toast
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id });

  // Dispatch the ADD_TOAST action to display the toast
  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss(); 
      },
    },
  });
  });

  return {
    id: id,
    dismiss,
    update,
  };
  };
}

// Custom hook to access the toast system
function useToast() {
  const [state, setState] = React.useState<State>(memoryState); 

  // Effect to subscribe to state changes
  React.useEffect(() => {
    listeners.push(setState); 
    return () => {
      const index = listeners.indexOf(setState);
      const index = listeners.indexOf(setState);
      if (index > -1) {
        listeners.splice(index, 1);
        listeners.splice(index, 1);
      }
    };
  }, [state]);
    };
  }, [state]);

  return {
    ...state,
    toast, 
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }), 
  };
}

export { useToast, toast };