import React, { useState, useEffect } from 'react';
import '../styles/PathAssertionsEditor.css';

const OPERATORS = [
  { value: 'equals', label: 'Equals' },
  { value: 'notEquals', label: 'Not Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'exists', label: 'Exists' }
];

function PathAssertionsEditor({ value, onChange }) {
  const [assertions, setAssertions] = useState([]);
  const [error, setError] = useState(null);

  // Initialize assertions from JSON string value
  useEffect(() => {
    try {
      if (value && value.trim()) {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          setAssertions(parsed);
          setError(null);
        } else {
          setError('Invalid format: expected array');
          setAssertions([]);
        }
      } else {
        setAssertions([]);
        setError(null);
      }
    } catch (err) {
      setError(`Invalid JSON: ${err.message}`);
      setAssertions([]);
    }
  }, [value]);

  // Update parent component when assertions change
  const updateParent = (newAssertions) => {
    setAssertions(newAssertions);
    const jsonString = JSON.stringify(newAssertions);
    onChange(jsonString);
    setError(null);
  };

  const addAssertion = () => {
    const newAssertion = {
      path: '',
      operator: 'equals',
      value: ''
    };
    updateParent([...assertions, newAssertion]);
  };

  const removeAssertion = (index) => {
    const newAssertions = assertions.filter((_, i) => i !== index);
    updateParent(newAssertions);
  };

  const updateAssertion = (index, field, newValue) => {
    const newAssertions = [...assertions];
    newAssertions[index] = {
      ...newAssertions[index],
      [field]: newValue
    };
    updateParent(newAssertions);
  };

  return (
    <div className="path-assertions-editor">
      <div className="assertions-header">
        <label className="form-label">JSON Path Assertions</label>
        <button
          type="button"
          className="btn btn-add-assertion"
          onClick={addAssertion}
        >
          + Add Assertion
        </button>
      </div>
      
      {error && (
        <div className="assertion-error">
          {error}
        </div>
      )}

      {assertions.length === 0 ? (
        <div className="assertions-empty">
          No assertions defined. Click "Add Assertion" to create one.
        </div>
      ) : (
        <div className="assertions-list">
          {assertions.map((assertion, index) => (
            <div key={index} className="assertion-item">
              <div className="assertion-row">
                <div className="assertion-field">
                  <label className="assertion-label">Path</label>
                  <input
                    type="text"
                    className="assertion-input"
                    value={assertion.path || ''}
                    onChange={(e) => updateAssertion(index, 'path', e.target.value)}
                    placeholder="e.g., data.status or response.items.0.name"
                  />
                </div>

                <div className="assertion-field">
                  <label className="assertion-label">Operator</label>
                  <select
                    className="assertion-select"
                    value={assertion.operator || 'equals'}
                    onChange={(e) => updateAssertion(index, 'operator', e.target.value)}
                  >
                    {OPERATORS.map(op => (
                      <option key={op.value} value={op.value}>
                        {op.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="assertion-field">
                  <label className="assertion-label">
                    Value {assertion.operator === 'exists' && '(optional)'}
                  </label>
                  <input
                    type="text"
                    className="assertion-input"
                    value={assertion.value || ''}
                    onChange={(e) => updateAssertion(index, 'value', e.target.value)}
                    placeholder={assertion.operator === 'exists' ? 'Not used for exists' : 'Expected value'}
                    disabled={assertion.operator === 'exists'}
                  />
                </div>

                <button
                  type="button"
                  className="btn-remove-assertion"
                  onClick={() => removeAssertion(index)}
                  title="Remove assertion"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="assertions-hint">
        <strong>Operators:</strong>
        <ul>
          <li><strong>Equals:</strong> Exact match of the value</li>
          <li><strong>Not Equals:</strong> Value must not match</li>
          <li><strong>Contains:</strong> String contains the specified value</li>
          <li><strong>Exists:</strong> Field must exist in response (value not used)</li>
        </ul>
        <strong>Path examples:</strong> <code>status</code>, <code>data.user.name</code>, <code>items.0.id</code>
      </div>
    </div>
  );
}

export default PathAssertionsEditor;
