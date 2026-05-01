import * as Effect from "effect/Effect";
import * as SqlClient from "effect/unstable/sql/SqlClient";

export default Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  yield* sql`
    UPDATE projection_projects
    SET default_model_selection_json = json_remove(
      json_set(
        default_model_selection_json,
        '$.instanceId',
        json_extract(default_model_selection_json, '$.provider')
      ),
      '$.provider'
    )
    WHERE default_model_selection_json IS NOT NULL
      AND json_valid(default_model_selection_json)
      AND json_type(default_model_selection_json, '$.instanceId') IS NULL
      AND json_type(default_model_selection_json, '$.provider') = 'text'
  `;

  yield* sql`
    UPDATE projection_threads
    SET model_selection_json = json_remove(
      json_set(
        model_selection_json,
        '$.instanceId',
        json_extract(model_selection_json, '$.provider')
      ),
      '$.provider'
    )
    WHERE model_selection_json IS NOT NULL
      AND json_valid(model_selection_json)
      AND json_type(model_selection_json, '$.instanceId') IS NULL
      AND json_type(model_selection_json, '$.provider') = 'text'
  `;

  yield* sql`
    UPDATE orchestration_events
    SET payload_json = json_set(
      json_remove(payload_json, '$.defaultModelSelection.provider'),
      '$.defaultModelSelection.instanceId',
      json_extract(payload_json, '$.defaultModelSelection.provider')
    )
    WHERE json_valid(payload_json)
      AND json_type(payload_json, '$.defaultModelSelection.instanceId') IS NULL
      AND json_type(payload_json, '$.defaultModelSelection.provider') = 'text'
  `;

  yield* sql`
    UPDATE orchestration_events
    SET payload_json = json_set(
      json_remove(payload_json, '$.modelSelection.provider'),
      '$.modelSelection.instanceId',
      json_extract(payload_json, '$.modelSelection.provider')
    )
    WHERE json_valid(payload_json)
      AND json_type(payload_json, '$.modelSelection.instanceId') IS NULL
      AND json_type(payload_json, '$.modelSelection.provider') = 'text'
  `;

  yield* sql`
    UPDATE provider_session_runtime
    SET runtime_payload_json = json_set(
      json_remove(runtime_payload_json, '$.modelSelection.provider'),
      '$.modelSelection.instanceId',
      json_extract(runtime_payload_json, '$.modelSelection.provider')
    )
    WHERE runtime_payload_json IS NOT NULL
      AND json_valid(runtime_payload_json)
      AND json_type(runtime_payload_json, '$.modelSelection.instanceId') IS NULL
      AND json_type(runtime_payload_json, '$.modelSelection.provider') = 'text'
  `;
});
