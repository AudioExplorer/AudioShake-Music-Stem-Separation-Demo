curl -X POST "https://api.audioshake.ai/tasks" \
  -H "x-api-key: ${api_key}" \
  -H "Content-Type: application/json" \
  -d '${payload}'



# After creation, GET this endpoint until all targets show "status": "completed":
#   https://api.audioshake.ai/tasks/<task_id>

# Get task status
curl https://api.audioshake.ai/tasks/TASK_ID \\
-H "x-api-key: ${api_key}"