// Dual Authentication Test Results Processor
// Custom processor for dual authentication test results

const fs = require('fs');
const path = require('path');

/**
 * Process and format test results for dual authentication system
 * @param {Object} results - Jest test results
 * @returns {Object} Processed results
 */
function processResults(results) {
  const timestamp = new Date().toISOString();
  const reportDir = path.join(process.cwd(), 'test-reports', 'dual-auth');
  
  // Ensure report directory exists
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  // Extract key metrics
  const summary = {
    timestamp,
    totalTests: results.numTotalTests,
    passedTests: results.numPassedTests,
    failedTests: results.numFailedTests,
    skippedTests: results.numPendingTests,
    testSuites: results.numTotalTestSuites,
    passedSuites: results.numPassedTestSuites,
    failedSuites: results.numFailedTestSuites,
    coverage: results.coverageMap ? extractCoverageData(results.coverageMap) : null,
    duration: results.testResults.reduce((total, suite) => total + (suite.perfStats?.end - suite.perfStats?.start || 0), 0),
    success: results.success
  };

  // Categorize tests by component
  const testsByComponent = categorizeTests(results.testResults);

  // Generate detailed report
  const detailedReport = {
    summary,
    testsByComponent,
    failedTests: extractFailedTests(results.testResults),
    performanceMetrics: extractPerformanceMetrics(results.testResults),
    recommendations: generateRecommendations(summary, testsByComponent)
  };

  // Write reports
  writeReports(reportDir, timestamp, summary, detailedReport);

  // Console output
  printSummary(summary, testsByComponent);

  return results;
}

/**
 * Extract coverage data from coverage map
 */
function extractCoverageData(coverageMap) {
  const coverage = {};
  
  if (coverageMap && typeof coverageMap.getCoverageSummary === 'function') {
    const summary = coverageMap.getCoverageSummary();
    coverage.lines = summary.lines.pct;
    coverage.functions = summary.functions.pct;
    coverage.branches = summary.branches.pct;
    coverage.statements = summary.statements.pct;
  }
  
  return coverage;
}

/**
 * Categorize tests by component
 */
function categorizeTests(testResults) {
  const categories = {
    authConfiguration: [],
    legacyProvider: [],
    bowpiProvider: [],
    providerFactory: [],
    authStoreManager: [],
    integration: [],
    other: []
  };

  testResults.forEach(suite => {
    const suiteName = suite.testFilePath;
    let category = 'other';

    if (suiteName.includes('AuthConfiguration')) {
      category = 'authConfiguration';
    } else if (suiteName.includes('LegacyAuthProvider')) {
      category = 'legacyProvider';
    } else if (suiteName.includes('BowpiAuthProvider')) {
      category = 'bowpiProvider';
    } else if (suiteName.includes('AuthProviderFactory')) {
      category = 'providerFactory';
    } else if (suiteName.includes('AuthStoreManager')) {
      category = 'authStoreManager';
    } else if (suiteName.includes('integration') || suiteName.includes('DualAuthSystem')) {
      category = 'integration';
    }

    categories[category].push({
      name: path.basename(suiteName),
      path: suiteName,
      tests: suite.numPassingTests + suite.numFailingTests + suite.numPendingTests,
      passed: suite.numPassingTests,
      failed: suite.numFailingTests,
      skipped: suite.numPendingTests,
      duration: suite.perfStats ? suite.perfStats.end - suite.perfStats.start : 0,
      success: suite.numFailingTests === 0
    });
  });

  return categories;
}

/**
 * Extract failed test details
 */
function extractFailedTests(testResults) {
  const failedTests = [];

  testResults.forEach(suite => {
    suite.testResults.forEach(test => {
      if (test.status === 'failed') {
        failedTests.push({
          suite: path.basename(suite.testFilePath),
          test: test.fullName,
          error: test.failureMessages?.[0] || 'Unknown error',
          duration: test.duration
        });
      }
    });
  });

  return failedTests;
}

/**
 * Extract performance metrics
 */
function extractPerformanceMetrics(testResults) {
  const metrics = {
    totalDuration: 0,
    averageSuiteDuration: 0,
    slowestSuites: [],
    fastestSuites: []
  };

  const suiteDurations = testResults.map(suite => ({
    name: path.basename(suite.testFilePath),
    duration: suite.perfStats ? suite.perfStats.end - suite.perfStats.start : 0
  })).filter(suite => suite.duration > 0);

  if (suiteDurations.length > 0) {
    metrics.totalDuration = suiteDurations.reduce((total, suite) => total + suite.duration, 0);
    metrics.averageSuiteDuration = metrics.totalDuration / suiteDurations.length;
    
    // Sort by duration
    suiteDurations.sort((a, b) => b.duration - a.duration);
    metrics.slowestSuites = suiteDurations.slice(0, 3);
    metrics.fastestSuites = suiteDurations.slice(-3).reverse();
  }

  return metrics;
}

/**
 * Generate recommendations based on test results
 */
function generateRecommendations(summary, testsByComponent) {
  const recommendations = [];

  // Coverage recommendations
  if (summary.coverage) {
    if (summary.coverage.lines < 85) {
      recommendations.push({
        type: 'coverage',
        priority: 'high',
        message: `Line coverage is ${summary.coverage.lines}%. Target is 85%+`
      });
    }
    if (summary.coverage.branches < 80) {
      recommendations.push({
        type: 'coverage',
        priority: 'medium',
        message: `Branch coverage is ${summary.coverage.branches}%. Target is 80%+`
      });
    }
  }

  // Failed tests recommendations
  if (summary.failedTests > 0) {
    recommendations.push({
      type: 'failures',
      priority: 'critical',
      message: `${summary.failedTests} tests are failing. Fix before deployment.`
    });
  }

  // Component-specific recommendations
  Object.entries(testsByComponent).forEach(([component, suites]) => {
    const failedSuites = suites.filter(suite => !suite.success);
    if (failedSuites.length > 0) {
      recommendations.push({
        type: 'component',
        priority: 'high',
        message: `${component} has ${failedSuites.length} failing test suite(s)`
      });
    }
  });

  return recommendations;
}

/**
 * Write reports to files
 */
function writeReports(reportDir, timestamp, summary, detailedReport) {
  try {
    // Summary report
    fs.writeFileSync(
      path.join(reportDir, `summary-${timestamp.replace(/[:.]/g, '-')}.json`),
      JSON.stringify(summary, null, 2)
    );

    // Detailed report
    fs.writeFileSync(
      path.join(reportDir, `detailed-${timestamp.replace(/[:.]/g, '-')}.json`),
      JSON.stringify(detailedReport, null, 2)
    );

    // Latest report (for CI/CD)
    fs.writeFileSync(
      path.join(reportDir, 'latest-summary.json'),
      JSON.stringify(summary, null, 2)
    );

    fs.writeFileSync(
      path.join(reportDir, 'latest-detailed.json'),
      JSON.stringify(detailedReport, null, 2)
    );

  } catch (error) {
    console.error('Failed to write test reports:', error);
  }
}

/**
 * Print summary to console
 */
function printSummary(summary, testsByComponent) {
  console.log('\n🧪 DUAL AUTHENTICATION TEST RESULTS');
  console.log('=====================================');
  
  // Overall summary
  console.log(`📊 Overall: ${summary.passedTests}/${summary.totalTests} tests passed`);
  console.log(`⏱️  Duration: ${(summary.duration / 1000).toFixed(2)}s`);
  console.log(`✅ Success: ${summary.success ? 'YES' : 'NO'}`);
  
  // Coverage
  if (summary.coverage) {
    console.log(`📈 Coverage: ${summary.coverage.lines}% lines, ${summary.coverage.branches}% branches`);
  }
  
  // Component breakdown
  console.log('\n📋 Component Breakdown:');
  Object.entries(testsByComponent).forEach(([component, suites]) => {
    if (suites.length > 0) {
      const totalTests = suites.reduce((sum, suite) => sum + suite.tests, 0);
      const passedTests = suites.reduce((sum, suite) => sum + suite.passed, 0);
      const failedSuites = suites.filter(suite => !suite.success).length;
      
      const status = failedSuites === 0 ? '✅' : '❌';
      console.log(`  ${status} ${component}: ${passedTests}/${totalTests} tests (${suites.length} suites)`);
    }
  });
  
  // Recommendations
  if (summary.failedTests > 0) {
    console.log('\n⚠️  RECOMMENDATIONS:');
    console.log('  - Fix failing tests before deployment');
    console.log('  - Review error messages in detailed report');
    console.log('  - Consider increasing test coverage');
  }
  
  console.log('\n=====================================\n');
}

module.exports = processResults;