import React from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

const KanbanBoard = ({ candidate, stages, onMove }) => {
    // Only one item to drag: the candidate card
    const cardId = `card-${candidate.id}`;

    const onDragEnd = (result) => {
        const { destination, source } = result;

        // If dropped outside a droppable area
        if (!destination) {
            return;
        }

        // If dropped in the same column, do nothing (though unlikely in this single-card context)
        if (destination.droppableId === source.droppableId) {
            return;
        }

        // Call the parent handler to update the candidate's stage
        onMove(destination.droppableId);
    };

    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex space-x-4 overflow-x-auto p-2">
                {stages.map((stage) => (
                    <Droppable droppableId={stage} key={stage}>
                        {(provided, snapshot) => (
                            <div
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                className={`w-64 flex-shrink-0 p-3 rounded-lg shadow-md ${
                                    snapshot.isDraggingOver ? 'bg-indigo-100' : 'bg-gray-50'
                                }`}
                                style={{ borderLeft: stage === candidate.currentStage ? '4px solid #4f46e5' : '4px solid transparent' }}
                            >
                                <h3 className="font-bold mb-3 text-sm uppercase text-gray-700">{stage.toUpperCase()}</h3>
                                
                                {stage === candidate.currentStage ? (
                                    // Draggable Card (only rendered in the current stage column)
                                    <Draggable draggableId={cardId} index={0}>
                                        {(provided) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                {...provided.dragHandleProps}
                                                className="bg-white p-3 rounded shadow-sm border border-indigo-200 cursor-grab"
                                            >
                                                <p className="font-medium text-indigo-700">{candidate.name}</p>
                                                <span className="text-xs text-gray-500">{candidate.email}</span>
                                            </div>
                                        )}
                                    </Draggable>
                                ) : (
                                    // Placeholder in other columns
                                    <div className="h-16 border border-dashed border-gray-300 rounded flex items-center justify-center text-gray-400 text-sm">
                                        Drop Candidate Here
                                    </div>
                                )}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                ))}
            </div>
        </DragDropContext>
    );
};

export default KanbanBoard;