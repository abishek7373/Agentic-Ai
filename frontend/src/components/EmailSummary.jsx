import React from 'react';

const PRIORITIES = [
  { key: 'high_priority', title: '🔥 High Priority', color: '#ff4d4f', bg: 'rgba(255,77,79,0.08)', border: 'rgba(255,77,79,0.35)' },
  { key: 'medium_priority', title: '⚠️ Medium Priority', color: '#faad14', bg: 'rgba(250,173,20,0.08)', border: 'rgba(250,173,20,0.30)' },
  { key: 'low_priority', title: '📩 Low Priority', color: '#52c41a', bg: 'rgba(82,196,26,0.08)', border: 'rgba(82,196,26,0.28)' },
];

const PRIORITY_KEYS = ['high_priority', 'medium_priority', 'low_priority'];

/**
 * Deep-search an object tree for priority arrays.
 * Traverses ALL keys/values and parses JSON strings along the way.
 * Returns the object containing high/medium/low_priority arrays, or null.
 */
function findSummaryNode(obj, depth = 0) {
  if (!obj || typeof obj !== 'object' || depth > 10) return null;

  // Direct match — this object itself has the priority arrays
  if (!Array.isArray(obj) && PRIORITY_KEYS.some((k) => Array.isArray(obj[k]))) {
    return obj;
  }

  // Iterate every value (works for objects and arrays alike)
  const values = Array.isArray(obj) ? obj : Object.values(obj);
  for (const child of values) {
    if (child && typeof child === 'object') {
      const found = findSummaryNode(child, depth + 1);
      if (found) return found;
    }
    // Any string value might be a JSON-encoded layer
    if (typeof child === 'string') {
      const parsed = safeParse(child);
      if (parsed) {
        const found = findSummaryNode(parsed, depth + 1);
        if (found) return found;
      }
    }
  }

  return null;
}

function safeParse(str) {
  if (typeof str !== 'string') return null;
  // Strip markdown code fences:  ```json ... ```  or  ``` ... ```
  let trimmed = str.trim();
  trimmed = trimmed.replace(/^```(?:json|JSON)?\s*\n?/, '').replace(/\n?```\s*$/, '').trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return null;
  try { return JSON.parse(trimmed); } catch { return null; }
}

/**
 * Detect whether data (raw object or text content) contains an email summary.
 */
export function isEmailSummary(raw, content) {
  if (raw && typeof raw === 'object' && findSummaryNode(raw)) return true;
  if (typeof raw === 'string') {
    const parsed = safeParse(raw);
    if (parsed && findSummaryNode(parsed)) return true;
  }
  // Fallback: try parsing content text as JSON
  if (typeof content === 'string') {
    const parsed = safeParse(content);
    if (parsed && findSummaryNode(parsed)) return true;
  }
  return false;
}

/**
 * Extract the summary buckets from any shape of data.
 */
export function extractSummaryData(raw, content) {
  if (raw && typeof raw === 'object') {
    const node = findSummaryNode(raw);
    if (node) return node;
  }
  if (typeof raw === 'string') {
    const parsed = safeParse(raw);
    if (parsed) { const node = findSummaryNode(parsed); if (node) return node; }
  }
  if (typeof content === 'string') {
    const parsed = safeParse(content);
    if (parsed) { const node = findSummaryNode(parsed); if (node) return node; }
  }
  return {};
}

export default function EmailSummary({ data, content }) {
  const buckets = extractSummaryData(data, content);
  const totalCount = PRIORITIES.reduce(
    (n, p) => n + (Array.isArray(buckets[p.key]) ? buckets[p.key].length : 0),
    0,
  );

  if (totalCount === 0) {
    return <p className="email-summary-empty">No emails to summarize.</p>;
  }

  return (
    <div className="email-summary">
      <div className="email-summary-header">
        <span className="email-summary-badge">{totalCount}</span>
        <span>Email Summary</span>
      </div>

      {PRIORITIES.map((priority) => {
        const emails = buckets[priority.key];
        if (!Array.isArray(emails) || emails.length === 0) return null;

        return (
          <div key={priority.key} className="email-priority-section">
            <h4
              className="email-priority-title"
              style={{ color: priority.color }}
            >
              {priority.title}
              <span className="email-priority-count">{emails.length}</span>
            </h4>

            {emails.map((mail, idx) => (
              <div
                key={idx}
                className="email-card"
                style={{
                  borderLeftColor: priority.color,
                  background: priority.bg,
                }}
              >
                <div className="email-card-subject">{mail.subject || '(no subject)'}</div>

                {mail.sender && (
                  <div className="email-card-meta">
                    <span className="email-card-label">From</span> {mail.sender}
                  </div>
                )}

                {mail.summary && (
                  <div className="email-card-summary">{mail.summary}</div>
                )}

                {mail.action_required && (
                  <div className="email-card-action">
                    <span className="email-card-action-badge">Action</span>
                    {mail.action_required}
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
