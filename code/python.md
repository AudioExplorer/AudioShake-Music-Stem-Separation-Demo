import requests
import time

# Create task
response = requests.post(
    'https://api.audioshake.ai/tasks',
    headers={
        'x-api-key': '${api_key}',
        'Content-Type': 'application/json'
    },
    json=${payload}
)

task = response.json()
task_id = task['id']
print("Created task:", task_id)

# Poll for completion
while True:
    status = requests.get(
        f'https://api.audioshake.ai/tasks/{task_id}',
        headers={'x-api-key': '${api_key}'}
    ).json()

    # Check whether ALL requested targets have completed
    if all(t.get('status') == 'completed' for t in status.get('targets', [])):
        print("\nAll targets completed.\n")

        # Print output URLs for each target + format
        for target in status['targets']:
            print(f"Target: {target['model']}")
            for o in target.get('output', []):
                print(f"  - {o.get('format')}: {o.get('link')}")
        break

    print("Waiting...")
    time.sleep(2)