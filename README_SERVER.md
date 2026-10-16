# راهنمای جامع راه‌اندازی سامانه کلاسی ۱۰۵۱ روی سرور

این پوشه (`deploy`) شامل تمامی فایل‌های کامپایل‌شده و آماده اجرای پروژه است. شما برای اجرای این پروژه روی سرور به نصب هیچ پکیج سنگین، کامپایلر یا ابزارهای توسعه (مانند Vite یا Tailwind) نیاز ندارید؛ سرور با **کتابخانه استاندارد Node.js** و بدون هیچ پیش‌نیاز خارجی طراحی شده است.

---

## 📁 محتویات این پوشه (`deploy`)

- `server.js`: وب‌سرور پروداکشن (ارائه‌دهنده وب‌سایت و APIها)
- `dist/`: فایل‌های کامپایل‌شده فرانت‌اند (HTML، CSS، جاوااسکریپت و تصاویر)
- `data/db.json`: پایگاه داده کاربران و اطلاعات ادمین
- `package.json`: تنظیمات اجرایی
- `class1051.service`: فایل سرویس لینوکس برای اجرای خودکار ۲۴ ساعته
- `Dockerfile` و `docker-compose.yml`: تنظیمات داکر (اختیاری)
- `nginx.conf`: نمونه کانفیگ Nginx برای اتصال دامنه و فعال‌سازی SSL

---

## 🔑 اطلاعات ورود پیش‌فرض مدیر (Admin)
- **نام کاربری:** `kiavash` یا `kiavashshtzd@gmail.com` یا `09155776751`
- **رمز عبور:** `kia@9065`
- **نقش:** مدیر کل (تایید دانش‌آموزان جدید، تایید و رد تکالیف و آزمون‌ها)

---

## 🚀 روش‌های اجرا روی سرور

### روش اول: اجرای مستقیم و سریع با Node.js (ساده‌ترین روش)

1. مطمئن شوید **Node.js** (ورژن 18 یا بالاتر) روی سرور شما نصب است:
   ```bash
   node -v
   ```
2. محتویات همین پوشه `deploy` را به سرور منتقل کنید (مثلاً در مسیر `/var/www/class1051` یا هر مسیر دلخواه).
3. وارد پوشه شوید و دستور زیر را اجرا کنید:
   ```bash
   node server.js
   ```
4. سامانه بلافاصله روی پورت **3000** فعال می‌شود:
   `http://YOUR_SERVER_IP:3000`

> 💡 **نکته برای اجرای پایدار در پس‌زمینه با PM2:**
> برای این که با بستن ترمینال سرور خاموش نشود:
> ```bash
> npm install -g pm2
> pm2 start server.js --name "class1051"
> pm2 save
> pm2 startup
> ```

---

### روش دوم: اجرای دائمی به عنوان سرویس سیستمی لینوکس (Systemd - استاندارد VPS)

این روش باعث می‌شود پروژه به صورت خودکار با روشن شدن سرور اجرا شود و در صورت قطعی ری‌استارت شود:

1. پوشه پروژه را در مسیر `/var/www/class1051` قرار دهید.
2. فایل سرویس را کپی کنید:
   ```bash
   sudo cp class1051.service /etc/systemd/system/
   ```
3. سرویس را فعال و استارت کنید:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable class1051
   sudo systemctl start class1051
   ```
4. مشاهده وضعیت:
   ```bash
   sudo systemctl status class1051
   ```

---

### روش سوم: اجرا با داکر (Docker Compose)

اگر از داکر روی سرور استفاده می‌کنید:
```bash
docker compose up -d
```
داده‌های دیتابیس به صورت خودکار در فولدر `data` مانت و ماندگار می‌شوند.

---

### 🌐 اتصال به دامنه و HTTPS با Nginx (اختیاری)

اگر می‌خواهید سایت روی دامنه شخصی بدون نوشتن پورت 3000 باز شود:

1. Nginx را نصب کنید:
   ```bash
   sudo apt update && sudo apt install -y nginx
   ```
2. محتوای فایل `nginx.conf` را در `/etc/nginx/sites-available/class1051` قرار دهید (نام دامنه خود را جایگزین کنید).
3. فعال‌سازی و ری‌استارت Nginx:
   ```bash
   sudo ln -s /etc/nginx/sites-available/class1051 /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```
4. دریافت SSL رایگان:
   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d yourdomain.com
   ```

---

### 🛡️ تنظیم فایروال سرور (در صورت باز نشدن سایت)
اگر سایت باز نشد، مطمئن شوید پورت سرور بسته نیست:
```bash
sudo ufw allow 3000/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw reload
```
