# Flow Analytics System

## Overview

The Flow Analytics system provides comprehensive performance metrics and insights for flow automation. It tracks execution statistics, identifies bottlenecks, and helps optimize workflow performance.

## Features

### 1. Automated Metrics Aggregation

- **Hourly Aggregation**: Runs every hour at :05 minutes past the hour
- **Node-Level Tracking**: Captures execution metrics for each node in a flow
- **Performance Analysis**: Identifies slow nodes and bottlenecks
- **Completion Rates**: Tracks success/failure rates for flows and nodes

### 2. Analytics Endpoints

#### Get Flow Analytics
```
GET /api/v1/analytics/flows/:flowId
```

Query Parameters:
- `startDate` (optional): Filter executions from this date
- `endDate` (optional): Filter executions until this date
- `limit` (optional): Maximum number of executions to analyze (default: 100)

Response:
```json
{
  "success": true,
  "data": {
    "flowId": "uuid",
    "flowName": "Welcome Flow",
    "isActive": true,
    "totalExecutions": 150,
    "completedExecutions": 140,
    "failedExecutions": 8,
    "runningExecutions": 2,
    "completionRate": 93.33,
    "avgExecutionTime": 45000,
    "nodeMetrics": [
      {
        "nodeId": "node-1",
        "nodeType": "send_message",
        "nodeName": "Welcome Message",
        "executionCount": 150,
        "successCount": 148,
        "failureCount": 2,
        "successRate": 98.67,
        "avgExecutionTime": 1200
      }
    ],
    "bottlenecks": [
      {
        "nodeId": "node-3",
        "nodeType": "http_request",
        "avgExecutionTime": 15000
      }
    ],
    "timestamp": "2025-11-06T10:00:00Z"
  }
}
```

#### Get All Flows Analytics
```
GET /api/v1/analytics/flows
```

Query Parameters:
- `startDate` (optional): Filter executions from this date
- `endDate` (optional): Filter executions until this date
- `sortBy` (optional): Sort field (default: 'totalExecutions')
- `sortOrder` (optional): 'asc' or 'desc' (default: 'desc')

#### Get Most Used Flows
```
GET /api/v1/analytics/flows/most-used
```

Query Parameters:
- `limit` (optional): Number of flows to return (default: 10)

Response:
```json
{
  "success": true,
  "data": [
    {
      "flowId": "uuid",
      "flowName": "Welcome Flow",
      "isActive": true,
      "triggerType": "message_received",
      "totalExecutions": 1500
    }
  ]
}
```

#### Get Slowest Nodes
```
GET /api/v1/analytics/flows/slowest-nodes
```

Query Parameters:
- `limit` (optional): Number of nodes to return (default: 10)

Response:
```json
{
  "success": true,
  "data": [
    {
      "flowId": "uuid",
      "flowName": "Order Processing",
      "nodeId": "node-5",
      "nodeType": "http_request",
      "nodeName": "Check Inventory",
      "executionCount": 500,
      "successCount": 495,
      "failureCount": 5,
      "successRate": 99.0,
      "avgExecutionTime": 25000
    }
  ]
}
```

#### Get Flow Performance Dashboard
```
GET /api/v1/analytics/flows/dashboard
```

Response:
```json
{
  "success": true,
  "data": {
    "mostUsedFlows": [...],
    "slowestNodes": [...],
    "overallStats": {
      "totalFlows": 25,
      "activeFlows": 18,
      "totalExecutions": 15000,
      "recentExecutions": 450,
      "statusCounts": {
        "completed": 14200,
        "failed": 300,
        "running": 500
      }
    }
  }
}
```

#### Get Overall Flow Stats
```
GET /api/v1/analytics/flows/stats
```

## Metrics Collected

### Flow-Level Metrics

1. **Total Executions**: Total number of times the flow has been executed
2. **Completed Executions**: Number of successful completions
3. **Failed Executions**: Number of failures
4. **Running Executions**: Currently executing instances
5. **Completion Rate**: Percentage of successful executions
6. **Average Execution Time**: Mean time to complete (in milliseconds)

### Node-Level Metrics

1. **Execution Count**: How many times the node was reached
2. **Success Count**: Successful node executions
3. **Failure Count**: Failed node executions
4. **Success Rate**: Percentage of successful executions
5. **Average Execution Time**: Mean time spent in the node

### Bottleneck Identification

The system automatically identifies bottlenecks by:
- Analyzing average execution time per node
- Ranking nodes by slowest execution time
- Highlighting top 3 slowest nodes per flow

## Cron Job Configuration

### Flow Analytics Aggregation

- **Schedule**: Every hour at :05 minutes past the hour (`5 * * * *`)
- **Function**: `flowAnalyticsService.aggregateFlowMetrics()`
- **Purpose**: Collect and aggregate flow execution metrics from the last hour

### Manual Trigger

You can manually trigger the analytics aggregation:

```bash
POST /api/v1/cron/trigger
{
  "jobName": "flow-analytics-aggregation"
}
```

## Execution Path Tracking

The system tracks the execution path of each flow run by:

1. Initializing an empty `executionPath` array in flow variables
2. Appending each visited node ID to the path
3. Using the path for node-level analytics calculations

This allows accurate tracking of:
- Which nodes were actually executed
- The order of node execution
- Conditional branch paths taken

## Performance Considerations

### Optimization Strategies

1. **Hourly Aggregation**: Reduces database load by processing in batches
2. **Limited History**: Analyzes last 100 executions per flow by default
3. **Indexed Queries**: Uses database indexes on `flow_id`, `status`, and `started_at`
4. **Cached Results**: Consider implementing Redis caching for frequently accessed metrics

### Scalability

- Designed to handle thousands of flows and millions of executions
- Aggregation runs asynchronously without blocking API requests
- Can be scaled horizontally by running on multiple instances

## Use Cases

### 1. Performance Monitoring

Monitor flow execution times and identify slow flows that need optimization.

### 2. Bottleneck Detection

Identify specific nodes causing delays (e.g., slow API calls, long wait times).

### 3. Success Rate Tracking

Track completion rates to identify flows with high failure rates.

### 4. Usage Analytics

Understand which flows are most frequently used to prioritize improvements.

### 5. Capacity Planning

Use execution trends to plan infrastructure scaling.

## Best Practices

### 1. Regular Monitoring

- Check the dashboard daily for anomalies
- Set up alerts for flows with low completion rates
- Monitor bottlenecks and optimize slow nodes

### 2. Date Range Filtering

- Use date filters to analyze specific time periods
- Compare metrics across different time ranges
- Identify trends and patterns

### 3. Node Optimization

- Focus on optimizing nodes with high execution times
- Consider caching for frequently called APIs
- Implement timeouts for external requests

### 4. Flow Design

- Keep flows simple and focused
- Avoid deeply nested conditions
- Use appropriate wait times

## Troubleshooting

### Missing Metrics

**Issue**: No metrics showing for a flow

**Solutions**:
- Verify the flow has been executed
- Check if executions are within the date range
- Ensure the flow is not deleted

### Inaccurate Execution Times

**Issue**: Execution times seem incorrect

**Solutions**:
- Verify `started_at` and `completed_at` timestamps are set
- Check for timezone issues
- Ensure executions are completing properly

### High Failure Rates

**Issue**: Flow showing high failure rate

**Solutions**:
- Check error messages in failed executions
- Review node configurations
- Test external API endpoints
- Verify contact data quality

## Future Enhancements

### Planned Features

1. **Historical Snapshots**: Store daily/weekly/monthly aggregated metrics
2. **Trend Analysis**: Compare metrics over time
3. **Alerts**: Automatic notifications for anomalies
4. **Export**: CSV/PDF export of analytics data
5. **Visualization**: Charts and graphs for metrics
6. **Predictive Analytics**: ML-based performance predictions

## API Permissions

All analytics endpoints require the `analytics.read` permission.

Role access:
- **Owner**: Full access
- **Admin**: Full access
- **Manager**: Full access
- **Agent**: Read-only access

## Related Documentation

- [Flow Execution Engine](./FLOW_EXECUTION_ENGINE.md)
- [Flow Automation](./FLOW_AUTOMATION.md)
- [Analytics & Reporting](./ANALYTICS_REPORTING.md)
