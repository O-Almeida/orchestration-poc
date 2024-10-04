# worker/worker_entrypoint.py

import os
import pika
import json
import requests
import subprocess

RABBITMQ_URL = os.environ.get('RABBITMQ_URL', 'amqp://guest:guest@rabbitmq:5672/')
SCRIPTS_SERVER_URL = os.environ.get('SCRIPTS_SERVER_URL', 'http://orchestrator:3000')
ORCHESTRATOR_RESULT_URL = os.environ.get('ORCHESTRATOR_RESULT_URL', 'http://orchestrator:3000/results')

def main():
    connection = pika.BlockingConnection(pika.URLParameters(RABBITMQ_URL))
    channel = connection.channel()
    channel.queue_declare(queue='tasks', durable=True)
    print(' [*] Waiting for tasks. To exit press CTRL+C')

    def callback(ch, method, properties, body):
        task = json.loads(body)
        script_name = task['scriptName']
        task_id = task.get('taskId')  # Get taskId if available
        print(f" [x] Received task for script: {script_name}")

        try:
            # Fetch the script from the orchestrator
            response = requests.get(f"{SCRIPTS_SERVER_URL}/scripts/{script_name}")
            if response.status_code != 200:
                print(f"Failed to fetch script {script_name}")
                ch.basic_ack(delivery_tag=method.delivery_tag)
                return

            script_content = response.text
            script_path = f"/tmp/{script_name}"
            with open(script_path, 'w') as script_file:
                script_file.write(script_content)

            # Execute the script and capture the output
            result = subprocess.run(['python', script_path], capture_output=True, text=True)
            output = result.stdout + result.stderr

            print(f" [✔] Completed script: {script_name}")

            # Send the result back to the orchestrator
            result_payload = {
                'taskId': task_id,
                'scriptName': script_name,
                'output': output
            }
            requests.post(ORCHESTRATOR_RESULT_URL, json=result_payload)
            print(f" [→] Sent result back to orchestrator for script: {script_name}")
        except Exception as e:
            print(f"Error executing script {script_name}: {e}")
        finally:
            ch.basic_ack(delivery_tag=method.delivery_tag)

    channel.basic_qos(prefetch_count=1)
    channel.basic_consume(queue='tasks', on_message_callback=callback)
    channel.start_consuming()

if __name__ == '__main__':
    main()
