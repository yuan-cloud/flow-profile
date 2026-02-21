export type ErrorPresentation = {
  title: string;
  summary: string;
  details: string | null;
  suggestions: string[];
};

const trimMessage = (message: string | null): string | null => {
  if (!message) return null;
  const trimmed = message.trim();
  return trimmed.length ? trimmed : null;
};

export const mapWorkerError = (message: string | null): ErrorPresentation => {
  const details = trimMessage(message);
  const lower = details?.toLowerCase() ?? '';

  if (lower.includes('rebuild requires rawjson')) {
    return {
      title: 'Missing flow data',
      summary:
        'We no longer have the original flow payload needed for a rebuild. Reload the flow and try again.',
      details,
      suggestions: [
        'Drag the flow JSON into the drop zone again.',
        'Keep the tab open so the original payload stays available.',
      ],
    };
  }

  if (lower.includes('unexpected token') || lower.includes('json')) {
    return {
      title: 'Invalid JSON detected',
      summary:
        'The flow export could not be parsed as valid JSON. This usually happens when the file is incomplete or edited by hand.',
      details,
      suggestions: [
        'Re-export the flow from Node-RED (Menu -> Export -> Download).',
        'Confirm the file ends with a closing bracket and is not truncated.',
        'If you edited the file, revert to a clean export and retry.',
      ],
    };
  }

  if (lower.includes('zod') || lower.includes('invalid_type') || lower.includes('schema')) {
    return {
      title: 'Flow schema mismatch',
      summary: 'The file parsed as JSON but does not match the expected Node-RED flow structure.',
      details,
      suggestions: [
        'Confirm the export came from Node-RED (not a settings or credentials file).',
        'Re-export using Menu -> Export -> Download.',
      ],
    };
  }

  if (lower.includes('worker processing error')) {
    return {
      title: 'Processing error',
      summary: 'The background worker hit an unexpected issue while building the context.',
      details,
      suggestions: [
        'Try rebuilding once more to see if the error clears.',
        'If it persists, refresh the page and reload the flow.',
      ],
    };
  }

  return {
    title: 'Something went wrong',
    summary: 'The flow could not be processed. Please try again or reload the flow.',
    details,
    suggestions: [
      'Retry the build to see if the issue resolves.',
      'Reload the flow JSON from disk to start fresh.',
    ],
  };
};
