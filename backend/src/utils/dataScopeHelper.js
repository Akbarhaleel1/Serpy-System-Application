/**
 * DataScope Helper Utility
 *
 * Provides utilities for handling data scoping to ensure data isolation
 * across users with the same dataScope (admin + their staff/managers)
 */

/**
 * Add dataScope filter to a query object
 * @param {Object} query - The existing query object
 * @param {string} dataScope - The dataScope from the authenticated user
 * @returns {Object} - The query with dataScope filter added
 */
function addDataScopeFilter(query, dataScope) {
  if (!dataScope) {
    throw new Error('DataScope is required for filtering');
  }

  return {
    ...query,
    dataScope
  };
}

/**
 * Create a dataScope query from scratch
 * @param {string} dataScope - The dataScope from the authenticated user
 * @returns {Object} - Query object with dataScope filter
 */
function createDataScopeQuery(dataScope) {
  if (!dataScope) {
    throw new Error('DataScope is required for filtering');
  }

  return { dataScope };
}

/**
 * Merge an existing query with dataScope filter
 * Ensures dataScope is always included in queries
 * @param {Object} baseQuery - The base query object
 * @param {string} dataScope - The dataScope from the authenticated user
 * @returns {Object} - Merged query with dataScope
 */
function mergeDataScopeQuery(baseQuery, dataScope) {
  if (!dataScope) {
    throw new Error('DataScope is required for filtering');
  }

  return {
    ...baseQuery,
    dataScope
  };
}

module.exports = {
  addDataScopeFilter,
  createDataScopeQuery,
  mergeDataScopeQuery
};
