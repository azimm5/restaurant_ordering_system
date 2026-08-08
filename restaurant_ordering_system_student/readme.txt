# 🍽️ Restaurant Management System

A full-stack **Restaurant Management System** designed to manage products, customer feedback, staff responses, orders, and administrative analytics.

The system demonstrates **RESTful API design, database-driven business logic, authentication, stored procedures/functions, validation, error handling, and responsive frontend development**.

---

## 📌 Overview

The Restaurant Management System provides separate functionality for **customers, staff, and administrators**.

### ✨ Key Capabilities

* 🍔 Product and category management
* ⭐ Customer feedback and ratings
* 💬 Staff responses to customer feedback
* 🧾 Order tracking
* 🔐 Authentication and authorisation
* 📊 Admin sales dashboard
* 🗄️ Database-level business logic
* ⚠️ Structured error handling
* 📱 Responsive frontend interface
* 🔄 Dynamic data loading without hardcoded values

---

# 🏗️ System Architecture

```text
┌─────────────────────────────┐
│          Frontend           │
│     HTML / CSS / JavaScript │
└──────────────┬──────────────┘
               │
               │ REST API / Fetch
               ▼
┌─────────────────────────────┐
│          Backend            │
│       Routes / Controllers  │
└──────────────┬──────────────┘
               │
               │ Model Methods
               ▼
┌─────────────────────────────┐
│           Models            │
│ Product / Member / Feedback │
│ Response / Order            │
└──────────────┬──────────────┘
               │
               │ Stored Procedures
               │ & Functions
               ▼
┌─────────────────────────────┐
│          Database           │
│ Validation + Business Logic │
└─────────────────────────────┘
```

---

# 🔧 Backend Architecture

## 📦 Models

The backend is structured around the following models:

| Model      | Responsibility                     |
| ---------- | ---------------------------------- |
| `Product`  | Product information and categories |
| `Member`   | Customer information               |
| `Feedback` | Customer ratings and comments      |
| `Response` | Staff responses to feedback        |
| `Order`    | Customer order information         |

Model methods communicate directly with **stored procedures and functions**, ensuring important business rules are enforced at the database level.

Examples include:

```text
get_feedback
create_feedback
update_feedback
delete_feedback
create_response
get_response
delete_response
```

### Why use stored procedures/functions?

* Centralises business logic
* Reduces duplicated validation
* Ensures consistent database operations
* Prevents invalid inserts and updates
* Provides a clear separation between application and database logic

---

## 🎮 Controllers

Controllers act as the bridge between **routes and models**.

They are responsible for:

* Calling the appropriate model methods
* Handling database responses
* Mapping database error codes to HTTP status codes
* Returning structured JSON responses
* Handling expected and unexpected errors

### Error Code Mapping

| Database Code | HTTP Status | Meaning                       |
| ------------- | ----------: | ----------------------------- |
| `P4040`       |       `404` | Product Not Found             |
| `P4041`       |       `404` | Feedback / Response Not Found |
| `P4042`       |       `404` | Member Not Found              |
| `P4030`       |       `403` | Forbidden                     |
| `P4000`       |       `400` | Invalid Rating                |

This provides predictable API behaviour for the frontend.

---

# 🌐 REST API Routes

## 🍔 Products

| Method | Endpoint               | Description                 |
| ------ | ---------------------- | --------------------------- |
| `GET`  | `/products/:id`        | Retrieve product details    |
| `GET`  | `/products/categories` | Retrieve product categories |

---

## ⭐ Feedback

| Method   | Endpoint               | Description                     |
| -------- | ---------------------- | ------------------------------- |
| `GET`    | `/feedback/:productId` | Retrieve feedback for a product |
| `POST`   | `/feedback`            | Create new feedback             |
| `PUT`    | `/feedback/:id`        | Update existing feedback        |
| `DELETE` | `/feedback/:id`        | Delete feedback                 |

---

## 💬 Responses

| Method   | Endpoint                | Description           |
| -------- | ----------------------- | --------------------- |
| `POST`   | `/response`             | Create staff response |
| `GET`    | `/response/:feedbackId` | Retrieve responses    |
| `DELETE` | `/response/:id`         | Delete response       |

> Response editing is intentionally not required by the system specification.

---

## 🧾 Orders

| Method | Endpoint                   | Description                       |
| ------ | -------------------------- | --------------------------------- |
| `GET`  | `/orders/latest/:memberId` | Retrieve member's latest order    |
| `GET`  | `/orders/statuses`         | Retrieve available order statuses |

---

## 📊 Dashboard

| Method | Endpoint           | Description                           |
| ------ | ------------------ | ------------------------------------- |
| `GET`  | `/dashboard/sales` | Retrieve aggregated sales information |

---

# 🗄️ Stored Procedures & Functions

Business logic is centralised within the database through stored procedures and functions.

## ⭐ Dining Feedback

### `create_feedback`

Creates a new customer feedback entry.

**Validation includes:**

* Product existence
* Member existence
* Rating validity
* Timestamp generation

**Error codes:**

```text
P4040 → Product not found
P4042 → Member not found
P4000 → Invalid rating
```

---

### `update_feedback`

Updates an existing feedback entry.

**Validation includes:**

* Feedback existence
* Ownership verification
* Rating and comment updates
* `updated_at` timestamp

```text
P4030 → Forbidden
P4041 → Feedback not found
```

---

### `delete_feedback`

Deletes a feedback entry after verifying ownership.

```text
P4030 → Forbidden
P4041 → Feedback not found
```

---

### `get_feedback`

Retrieves feedback submitted by a member or associated with a product.

The function joins feedback data with member information to display usernames alongside reviews.

```text
P4040 → Product not found
P4041 → No feedback found
```

---

# 💬 Feedback Responses

### `create_response`

Allows authorised staff or administrators to respond to customer feedback.

```text
P4041 → Feedback not found
```

### `get_response`

Retrieves responses associated with a feedback entry, including:

* Staff username
* Response content
* Timestamp

### `delete_response`

Allows authorised users to delete a response.

```text
P4030 → Forbidden
P4041 → Response not found
```

---

# 🧾 Orders & Products

### `get_latest_order`

Retrieves the latest order associated with a member.

This is used when creating feedback to ensure the feedback can be associated with the correct order.

### `get_order_statuses`

Retrieves all available order statuses directly from the database.

This allows the frontend to populate dropdowns dynamically instead of relying on hardcoded values.

### `get_product_categories`

Retrieves available product categories from the database for dynamic frontend selection.

---

# 📊 Dashboard & Analytics

### `get_sale_order_summary`

Provides aggregated sales information for the administrator dashboard.

The summary includes:

* Total number of orders
* Total revenue
* Sales breakdown by product

The returned data powers the dashboard's **charts and tables**, providing administrators with an overview of restaurant sales performance.

---

# 🎨 Frontend

## 🍔 Product Detail Page

Displays:

* Product information
* Product category
* Customer feedback
* Ratings
* Responsive feedback cards

Feedback ratings are visually differentiated to improve readability.

---

## ⭐ Feedback Pages

### Feedback Index

Displays customer feedback for a selected product.

Feedback is ordered based on:

1. Rating
2. Last updated time

### Create Feedback

Provides a form for customers to submit feedback.

Features include:

* Client-side validation
* Rating selection
* Comment input
* Backend error handling

### Edit Feedback

Allows customers to modify their own feedback.

Features include:

* Ownership validation
* Live validation
* Error messages
* Updated feedback display

### Delete Feedback

Uses a confirmation prompt before permanently deleting feedback.

---

# 💬 Staff Response Page

Staff members can respond directly to customer feedback.

Responses are displayed as a separate conversation thread, making it easy to distinguish:

```text
Customer Feedback
        ↓
Staff Response
        ↓
Customer Feedback
        ↓
Staff Response
```

---

# 📊 Admin Dashboard

The administrator dashboard provides an overview of:

* Customer feedback
* Ratings
* Sales performance
* Product performance
* Order statistics

Data can be sorted and reviewed by:

* Rating
* Date
* Product

This provides administrators with a centralised view of **customer sentiment and business performance**.

---

# 🔐 Authentication & Authorisation

Protected routes use authentication middleware to ensure that only authorised users can access restricted functionality.

Access control is applied to operations such as:

* Creating feedback
* Editing feedback
* Deleting feedback
* Creating responses
* Deleting responses
* Accessing administrative dashboard data

Ownership checks are also performed before users can modify or delete their own resources.

---

# ⚡ JavaScript Integration

The frontend communicates with the backend using **Fetch/AJAX requests**.

```text
User Action
     ↓
JavaScript Event
     ↓
Fetch API Request
     ↓
REST API Endpoint
     ↓
Controller
     ↓
Model
     ↓
Stored Procedure / Function
     ↓
Database
     ↓
JSON Response
     ↓
DOM Update
```

The frontend dynamically updates the page without requiring a full page reload.

### Error Handling

Backend errors are returned as structured JSON and displayed clearly within the frontend interface.

---

# 🛡️ Validation & Error Handling

Validation is implemented across multiple layers.

### Frontend

* Input validation
* Required fields
* Rating validation
* User-friendly error messages

### Backend

* Authentication
* Authorisation
* HTTP status code mapping
* Structured JSON responses
* Unexpected error handling

### Database

* Product validation
* Member validation
* Feedback validation
* Ownership checks
* Rating validation
* Business rule enforcement

This layered approach helps prevent invalid data from reaching the database.

---

# 📋 API Response Design

The API uses structured JSON responses to maintain predictable communication between the frontend and backend.

Example:

```json
{
    "message": "Feedback created successfully",
    "feedback": {
        "feedback_id": 101,
        "rating": 5,
        "comment": "Excellent food and service!"
    }
}
```

Errors follow a consistent structure, allowing the frontend to handle failures appropriately.

---

# 🧪 Testing

The application was tested using both **successful and failed scenarios**.

### ✅ Successful Test Cases

* Create valid feedback
* Retrieve product feedback
* Update owned feedback
* Delete owned feedback
* Create staff response
* Retrieve responses
* Retrieve latest order
* Retrieve product categories
* Retrieve order statuses
* Load dashboard sales data

### ❌ Failed Test Cases

* Invalid rating
* Non-existent product
* Non-existent member
* Non-existent feedback
* Unauthorised update
* Unauthorised deletion
* Invalid request data

Database error codes are correctly translated into appropriate HTTP responses.

---

# 📁 Project Structure

```text
Restaurant-Management-System/
│
├── controllers/
│   ├── productController.js
│   ├── feedbackController.js
│   ├── responseController.js
│   └── orderController.js
│
├── models/
│   ├── Product.js
│   ├── Member.js
│   ├── Feedback.js
│   ├── Response.js
│   └── Order.js
│
├── routes/
│   ├── products.js
│   ├── feedback.js
│   ├── response.js
│   ├── orders.js
│   └── dashboard.js
│
├── database/
│   ├── procedures/
│   └── functions/
│
├── public/
│   ├── css/
│   ├── js/
│   └── pages/
│
└── README.md
```

---

# 🧰 Technologies Used

| Layer            | Technologies                  |
| ---------------- | ----------------------------- |
| Frontend         | HTML, CSS, JavaScript         |
| Communication    | Fetch API / AJAX              |
| Backend          | Node.js, Express              |
| Database         | MySQL                         |
| Database Logic   | Stored Procedures & Functions |
| API Architecture | REST                          |
| Authentication   | Authentication Middleware     |
| Data Format      | JSON                          |

---

# 🌟 Key Highlights

> **Database-driven business logic**
> Stored procedures and functions centralise validation and business rules.

> **Predictable API behaviour**
> Database error codes are mapped to appropriate HTTP status codes.

> **Secure resource management**
> Authentication, authorisation, and ownership checks protect sensitive operations.

> **Dynamic frontend**
> Data is retrieved from the database instead of relying on hardcoded dropdown values.

> **Full CRUD functionality**
> Customers can create, read, update, and delete feedback, while staff can manage responses.

> **Administrative analytics**
> Sales and feedback data are aggregated into a centralised dashboard.

---

# 🚀 Future Improvements

Potential enhancements include:

* 📈 More advanced sales analytics
* 🔔 Real-time notifications for new feedback
* 📱 Improved mobile optimisation
* 🔍 Advanced feedback filtering and search
* 📊 Customer sentiment analysis
* ⭐ Average rating trends over time
* 👤 More granular staff permissions
* 📤 Export dashboard data to CSV/PDF

---

# 👨‍💻 Project Summary

The Restaurant Management System demonstrates how a full-stack application can combine **RESTful APIs, database-level business logic, authentication, validation, and responsive frontend development** into a cohesive system.

The project places particular emphasis on **maintainability, data integrity, predictable API behaviour, and separation of responsibilities** across the frontend, backend, and database layers.
