# 🛍️ RawStitch — Retail Management System + E-Commerce Platform

> A unified platform that powers your physical shop and online store from a single dashboard.

[![Live Demo](https://img.shields.io/badge/Live-rawstitch.com.bd-blue?style=flat-square)](https://rawstitch.com.bd)
![Python](https://img.shields.io/badge/Backend-Python%20%7C%20Django-3776AB?style=flat-square&logo=python)
![TypeScript](https://img.shields.io/badge/Frontend-TypeScript%20%7C%20Next.js-3178C6?style=flat-square&logo=typescript)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

---

## 📖 Overview

**RawStitch** is a full-featured Retail Management System (RMS) with a built-in E-Commerce storefront. Designed for modern retail shops, it bridges the gap between in-store operations and online sales — letting you manage inventory, orders, customers, and sales reporting all from one place.

Whether a customer walks into your shop or orders from your website, every transaction flows through the same unified system.

---

## ✨ Features

### 🏪 Retail Management (In-Store)
- **Point of Sale (POS)** — Fast, intuitive billing for walk-in customers
- **Inventory Management** — Track stock levels, set reorder alerts, and manage product variants
- **Product Catalogue** — Organize products by category, size, color, and SKU
- **Purchase Management** — Record supplier purchases and manage incoming stock
- **Customer Management** — Maintain customer profiles and purchase history
- **Staff & Role Management** — Assign roles and permissions to employees

### 🛒 E-Commerce (Online Store)
- **Online Storefront** — A customer-facing shop at [rawstitch.com.bd](https://rawstitch.com.bd)
- **Product Listings** — Synced directly from your inventory — no double entry
- **Order Management** — View, process, and fulfill online orders from the dashboard
- **Cart & Checkout** — Smooth buying experience for online customers
- **Delivery Zones** — Dhaka thana-based delivery area configuration
- **Customer Accounts** — Order tracking and history for registered buyers

### 📊 Reporting & Analytics
- Daily, weekly, and monthly sales reports
- Best-selling products and low-stock alerts
- Revenue breakdown by channel (in-store vs. online)
- Customer purchase trends

---

## 🗂️ Project Structure

```
retail-management-sytstem/
│
├── rms_backend/          # Django REST API — business logic, models, and endpoints
├── rms_frontend/         # Next.js admin dashboard — POS, inventory, reporting
├── rms_ecom/             # E-Commerce storefront — customer-facing online shop
│
├── requirements.txt      # Python dependencies
├── render.yaml           # Deployment config (Render.com)
└── dhaka_thanas_structure.json   # Delivery zone data for Dhaka
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Python, Django, Django REST Framework |
| **Admin Frontend** | TypeScript, Next.js, React |
| **E-Commerce Frontend** | TypeScript, Next.js, React |
| **Database** | PostgreSQL |
| **Deployment** | Render.com |
| **Styling** | CSS / Tailwind CSS |

---

## 🚀 Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL

---

### 1. Clone the Repository

```bash
git clone https://github.com/AsirMahmud/retail-management-sytstem.git
cd retail-management-sytstem
```

---

### 2. Backend Setup

```bash
# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate        # On Windows: venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt

# Navigate to backend directory
cd rms_backend

# Copy environment variables
cp .env.example .env
# Edit .env with your database credentials and secret key

# Run migrations
python manage.py migrate

# Create a superuser (admin account)
python manage.py createsuperuser

# Start the development server
python manage.py runserver
```

The API will be available at `http://localhost:8000`

---

### 3. Admin Frontend Setup (Retail Dashboard)

```bash
cd rms_frontend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:8000

# Start the development server
npm run dev
```

The admin dashboard will be available at `http://localhost:3000`

---

### 4. E-Commerce Frontend Setup

```bash
cd rms_ecom

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:8000

# Start the development server
npm run dev
```

The online store will be available at `http://localhost:3001`

---

## ⚙️ Environment Variables

### Backend (`rms_backend/.env`)

```env
SECRET_KEY=your_django_secret_key
DEBUG=True
DATABASE_URL=postgres://user:password@localhost:5432/rms_db
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

### Frontend (`rms_frontend/.env.local` and `rms_ecom/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SHOP_NAME=RawStitch
```

---

## 🌐 Deployment

This project is configured for deployment on [Render.com](https://render.com) via `render.yaml`.

```bash
# Build and deploy using Render's dashboard or CLI
# The render.yaml handles service configuration automatically
```

For production, make sure to:
- Set `DEBUG=False` in the backend
- Configure your PostgreSQL database URL
- Set `ALLOWED_HOSTS` to your domain
- Configure CORS to allow your frontend domains

---

## 🗺️ Delivery Zones

The file `dhaka_thanas_structure.json` contains structured delivery zone data for Dhaka, Bangladesh. This powers the delivery area selection during checkout on the e-commerce storefront.

---

## 📸 Screenshots

> _Coming soon — POS interface, inventory dashboard, and online storefront previews._

---

## 🤝 Contributing

Contributions are welcome! Here's how to get started:

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/your-feature-name`
5. Open a Pull Request

Please make sure your code follows the existing code style and includes relevant tests.

---

## 🐛 Issues

Found a bug or have a feature request? Please [open an issue](https://github.com/AsirMahmud/retail-management-sytstem/issues).

---

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Asir Mahmud**
- GitHub: [@AsirMahmud](https://github.com/AsirMahmud)
- Live Project: [rawstitch.com.bd](https://rawstitch.com.bd)

---

> Built with ❤️ for retail businesses in Bangladesh
