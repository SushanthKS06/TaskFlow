output "instance_public_ip" {
  description = "Public IP of the EC2 instance"
  value       = aws_instance.taskflow_server.public_ip
}

output "ssh_command" {
  description = "Command to SSH into the instance"
  value       = "ssh -i taskflow-key.pem ubuntu@${aws_instance.taskflow_server.public_ip}"
}
