import React from 'react';
import './BranchModal.css';

function BranchModal({ branch, onChoice }) {
  if (!branch || !branch.has_branch) return null;

  return (
    <div className="branch-modal-overlay">
      <div className="branch-modal-content">
        <h3>🔀 推演分支点：{branch.title}</h3>
        <div className="options-container">
          {branch.options.map(option => (
            <button 
              key={option.id}
              className="option-button"
              onClick={() => onChoice(option.id)}
            >
              <div className="option-text">{option.text}</div>
              <div className="option-description">{option.description}</div>
            </button>
          ))}
        </div>
        <p className="option-note">选择后生成经济后果推演报告</p>
      </div>
    </div>
  );
}

export default BranchModal;