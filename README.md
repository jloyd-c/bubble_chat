# Title: BUBBLE CHAT

## Teacher/Professor: Ian Agapito

## Subject: 

- cloudflared.exe tunnel --url http://localhost:8000


- redis-server.exe --port 6380


- daphne -p 8000 Bubble_chat.asgi:application

## for main
- git add .
- git commit -m "message"
- git push

## for branch
- git add .
 or 
- git add specific_file
- git commit -m "message"
## Push the Branch to GitHub (First Time)
- git push -u origin my-branch-name
## If the Branch Already Exists Online
- git push origin my-branch-name
 or
- git push


## for cleanup of message in database
- python manage.py cleanup_messages

