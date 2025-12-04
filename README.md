# Title: BUBBLE CHAT

Teacher/Professor: Ian Agapito

Subject: 

cloudflared.exe tunnel --url http://localhost:8000


redis-server.exe --port 6380


daphne -p 8000 Bubble_chat.asgi:application


git add .
git commit -m "Move all apps into apps/ folder and update paths"
git push



for cleanup of message in database
python manage.py cleanup_messages