function formatTimestamp() {
  const date = new Date();
  const timeZone = Session.getScriptTimeZone();
  return Utilities.formatDate(date, timeZone, 'yyyy-MM-dd HH:mm:ss');
}

/**
 * Retrieves the active sheet's selected range as JSON with validated headers and values.
 * @param {Object} [options] - Optional parameters.
 * @param {number} [options.headerRowIndex] - 1-based index of the header row to use.
 * @returns {{headers: string[], values: any[][]}|{error: boolean, message: string}}
 */
function getSelectedRangeAsJson(options) {
  const opts = options || {};
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      return { error: true, message: 'No active spreadsheet found.' };
    }
    const sheet = ss.getActiveSheet();
    if (!sheet) {
      return { error: true, message: 'No active sheet found.' };
    }
    const range = sheet.getActiveRange();
    if (!range) {
      return { error: true, message: 'No range selected.' };
    }
    const startCol = range.getColumn();
    const numCols = range.getNumColumns();
    const frozenRows = sheet.getFrozenRows();
    const defaultHeaderRow = frozenRows > 0 ? frozenRows : 1;
    let headerRowNum = defaultHeaderRow;
    if (opts.headerRowIndex != null) {
      if (!Number.isInteger(opts.headerRowIndex) || opts.headerRowIndex < 1) {
        return { error: true, message: 'Invalid headerRowIndex provided.' };
      }
      headerRowNum = opts.headerRowIndex;
    }
    const maxRows = sheet.getMaxRows();
    if (headerRowNum > maxRows) {
      return { error: true, message: 'Header row index is out of bounds.' };
    }
    const headerValuesRow = sheet
      .getRange(headerRowNum, startCol, 1, numCols)
      .getValues()[0];
    const validIndices = [];
    const headers = [];
    headerValuesRow.forEach((cell, idx) => {
      if (typeof cell === 'string' && cell.trim() !== '') {
        validIndices.push(idx);
        headers.push(cell.trim());
      }
    });
    if (headers.length === 0) {
      return { error: true, message: 'No valid headers found in the specified header row.' };
    }
    const values = range.getValues();
    const filteredValues = values.map(row =>
      validIndices.map(colIdx => row[colIdx])
    );
    return { headers: headers, values: filteredValues };
  } catch (err) {
    return { error: true, message: 'Error retrieving selected range: ' + err.message };
  }
}

/**
 * Builds a JSON object containing a timestamp, headers, and values for the selected range.
 * @param {Object} [options] - Options forwarded to getSelectedRangeAsJson.
 * @returns {{timestamp: string, headers: string[], values: any[][]}|{error: boolean, message: string}}
 */
function getTimestampedRangeJson(options) {
  try {
    const selection = getSelectedRangeAsJson(options);
    if (selection.error) {
      return selection;
    }
    return {
      timestamp: formatTimestamp(),
      headers: selection.headers,
      values: selection.values
    };
  } catch (err) {
    return { error: true, message: 'Error generating timestamped JSON: ' + err.message };
  }
}

/**
 * Returns the timestamped range JSON as a string.
 * @param {Object} [options] - Options forwarded to getTimestampedRangeJson.
 * @returns {string} JSON string, or JSON string of an error object.
 */
function getTimestampedRangeJsonString(options) {
  try {
    const result = getTimestampedRangeJson(options);
    return JSON.stringify(result);
  } catch (err) {
    return JSON.stringify({ error: true, message: 'Error stringifying timestamped JSON: ' + err.message });
  }
}

/**
 * Alias for compatibility: delegates to getSelectedRangeAsJson.
 * Some callers reference getSelectedRangeAsJsonForTimestamp.
 * @param {Object} [options] - Options forwarded to getSelectedRangeAsJson.
 * @returns {{headers: string[], values: any[][]}|{error: boolean, message: string}}
 */
function getSelectedRangeAsJsonForTimestamp(options) {
  return getSelectedRangeAsJson(options);
}