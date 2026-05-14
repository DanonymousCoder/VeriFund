# AI/ML Replacement Guide

This file is the exact handoff for the AI/ML developer.

## Main rule

Do not make the backend team rewrite all integrations.

Replace model internals inside the AI service while keeping the current HTTP route contracts stable.

## Files to replace first

- `C:\Users\USER\Downloads\verifund-backend\verifund\ai-service\ai_service\services\anomaly_service.py`
- `C:\Users\USER\Downloads\verifund-backend\verifund\ai-service\ai_service\services\risk_service.py`
- `C:\Users\USER\Downloads\verifund-backend\verifund\ai-service\ai_service\services\whistleblower_service.py`
- `C:\Users\USER\Downloads\verifund-backend\verifund\ai-service\ai_service\services\graph_service.py`

Optional model/data artifact folders:

- `C:\Users\USER\Downloads\verifund-backend\verifund\ai-service\data\`
- `C:\Users\USER\Downloads\verifund-backend\verifund\ai-service\trained_models\`

## Existing routes the backend already uses

- `POST /api/ai/score-transaction/`
- `POST /api/ai/score-cooperative/`
- `GET /api/ai/score-cooperative/{cooperative_id}/`
- `POST /api/ai/triage-report/`
- `GET /api/ai/health-scores/`
- `GET /api/ai/health-scores/all/`
- `POST /api/ai/analyze-graph/`
- `GET /api/ai/analyze-graph/{cooperative_id}/`

## What each route must keep returning

### `score-transaction`

Must keep:

- `anomaly_score`
- `flagged`
- `reason`
- `model`

Safe example:

```json
{
  "anomaly_score": 0.84,
  "flagged": true,
  "reason": "Contribution deviates from recent temporal pattern.",
  "model": "iforest_lstm_v1"
}
```

### `score-cooperative`

Must keep:

- `cooperative_id`
- `risk_score`
- `health_score`
- `top_features`
- `feature_snapshot`
- `model`

### `triage-report`

Must keep:

- `intent`
- `corroboration_score`
- `evidence_summary`
- `escalate`
- `model`

### `analyze-graph`

Must keep:

- `cooperative_id`
- `summary`
- `nodes`
- `edges`
- `suspicious_clusters`
- `model`

## Where these outputs are consumed

### Contribution service

`contribution_service.record_contribution()` calls `score-transaction`.

If you break that response shape, contribution webhook scoring breaks.

### Withdrawal service

`withdrawal_service.request_withdrawal()` calls `score-cooperative`.

It expects a `risk_score` that can be converted into a 0-1 local threshold.

### Cooperative service

`cooperative_service.get_trust_score()` calls `score-cooperative`.

It uses:

- `health_score`
- `top_features`

### Frontend / admin graph screen

The new graph endpoint is intended for the fraud network visualization and admin/regulator graph screens.

## Best replacement strategy

### Step 1

Keep the route files unchanged:

- `C:\Users\USER\Downloads\verifund-backend\verifund\ai-service\ai_service\views\ai_views.py`
- `C:\Users\USER\Downloads\verifund-backend\verifund\ai-service\ai_service\urls.py`

Only replace the service functions first.

### Step 2

Load models from `trained_models/`:

- `isolation_forest.pkl`
- `lstm_anomaly.pt`
- `xgboost_risk.pkl`
- graph model artifacts

If a model file is missing, fall back gracefully to the current heuristic/rule-based logic instead of crashing.

### Step 3

Add versioned model names to the `model` field.

Examples:

- `iforest_lstm_v1`
- `xgboost_shap_v2`
- `graphsage_v1`
- `tfidf_logreg_v1`

## If the AI/ML dev wants to add new routes

That is allowed, but they should not remove the current ones.

If they add a new route, they must also tell the frontend/backend team:

- the path
- request body
- response shape
- whether the gateway/frontend needs updating

## Minimum deliverable to avoid breaking integration

If time is short, the AI/ML dev can:

1. swap `anomaly_service.py`
2. swap `risk_service.py`
3. leave graph + triage as fallback for the demo

That already improves the core product without forcing route changes across the app.
