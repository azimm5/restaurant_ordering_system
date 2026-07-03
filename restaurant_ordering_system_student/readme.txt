Restaurant Management System
📖 Overview
This project is a full‑stack application designed to manage product details, customer feedback, and staff responses, with an integrated admin dashboard for oversight. It demonstrates robust backend logic through stored procedures/functions, clean API design, and a responsive frontend that delivers a smooth user experience.

🔧 Backend Architecture
Models
Product, Member, Feedback, Response, and Order models are linked with proper relationships.

Each model method calls stored functions/procedures directly (e.g., get_feedback, create_feedback, update_feedback, create_response), ensuring business logic is enforced at the database level.

Validation rules are embedded in the database layer, preventing invalid inserts or updates.

Controllers
Controllers act as the bridge between routes and models, mapping database error codes to clear HTTP status codes.

Example: P4040 → HTTP 404 (Product Not Found), P4041 → HTTP 404 (Feedback Not Found), P4030 → HTTP 403 (Forbidden).

Responses are structured JSON, making them predictable and easy to consume by the frontend.

Error handling ensures both expected and unexpected issues are surfaced clearly.

Routes
RESTful endpoints follow consistent naming:

GET /products/:id → Product detail

GET /feedback/:productId → Feedback index

POST /feedback → Create feedback

PUT /feedback/:id → Edit feedback

DELETE /feedback/:id → Delete feedback

POST /response → Create staff response

GET /response/:feedbackId → Retrieve responses

DELETE /response/:id → Delete response

GET /orders/latest/:memberId → Get latest order for a member

GET /orders/statuses → Get order statuses

GET /products/categories → Get product categories

GET /dashboard/sales → Sales order summary

Routes are secured with authentication middleware, ensuring only authorised users can create/edit feedback or access the dashboard.

🗄️ Stored Functions & Procedures
Dining Feedback
create_feedback  
Inserts a new feedback entry. Validates product, member, and rating. Sets timestamps.
Error codes: P4040 (Product not found), P4042 (Member not found), P4000 (Invalid rating).

update_feedback  
Updates an existing feedback entry. Validates ownership. Updates rating, comment, and updated_at.
Error codes: P4030 (Forbidden), P4041 (Feedback not found).

delete_feedback  
Deletes a feedback entry. Validates ownership before deletion.
Error codes: P4030 (Forbidden), P4041 (Feedback not found).

get_feedback  
Retrieves all feedback submitted by a customer or for a product. Joins with member usernames.
Error codes: P4040 (Product not found), P4041 (No feedback found).

Feedback Responses
create_response  
Allows staff/admin to reply to customer feedback. Validates feedback exists.
Error codes: P4041 (Feedback not found).

get_response  
Retrieves multiple responses linked to a feedback entry. Returns staff usernames and timestamps.

delete_response  
Deletes a response. Validates ownership or admin rights.
Error codes: P4030 (Forbidden), P4041 (Response not found).

(Updating a response is not required.)

Orders & Products
get_latest_order  
Retrieves the most recent order for a given member. Used to aid create_feedback by linking feedback to the correct order.

get_order_statuses  
Returns all possible order statuses from the database, ensuring dropdowns are populated dynamically instead of hard‑coded.

get_product_categories  
Returns product categories from the database, used to populate dropdowns in the frontend.

Dashboard & Analytics
get_sale_order_summary  
Returns aggregated sales data for the admin dashboard. Includes total orders, revenue, and breakdown by product.
Frontend impact: Powers dashboard charts and tables.

🎨 Frontend Implementation
Product Detail Page  
Displays product information alongside linked feedback. Feedback cards styled with responsive CSS and colour‑coded ratings.

Feedback Pages

Index Page: Lists all feedback for a product, ordered by rating and update time.

Create Page: Form for submitting new feedback, with client‑side validation.

Edit Page: Allows users to update their feedback, showing live validation and error messages.

Delete Action: Confirmation prompts before removal.

Response Page  
Staff can reply to feedback directly, creating a visible conversation thread. Responses styled distinctly from customer comments.

Dashboard  
Admin view aggregates feedback statistics and sales summaries, sortable by rating, date, or product. Provides clear oversight of customer sentiment and business performance.

JavaScript Integration

Fetch/AJAX calls connect frontend pages to backend routes.

Real‑time DOM updates ensure feedback and responses appear instantly.

Error messages from backend surfaced clearly in the UI.

✅ Key Features
Stored functions centralise business logic in the database.

Error codes mapped to HTTP status codes for predictable API behaviour.

Full CRUD support for feedback and responses.

Dynamic dropdowns for order statuses and product categories (no hardcoding).

Responsive, accessible frontend with semantic HTML and styled components.

Admin dashboard for oversight and analytics.

Robust error handling demonstrated with screenshots of both successful and failed test cases.