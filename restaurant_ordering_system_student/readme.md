# 🍽️ Restaurant Management System

A full-stack **Restaurant Management System** designed to manage products, customer feedback, staff responses, customer orders, shopping carts, checkout, discounts, delivery fees, and administrative analytics.

The system demonstrates **RESTful API design, authentication and authorisation, Prisma ORM, PostgreSQL database design, stored procedures and functions, transaction management, server-side validation, error handling, configurable business rules, and responsive frontend development**.

---

# 📌 Overview

The Restaurant Management System provides separate functionality for **customers, staff, and administrators**.

### ✨ Key Capabilities

* 🍔 Product and category management
* 🛒 Persistent shopping carts
* 🧾 Cart and cart-item management
* 💳 Checkout and order placement
* 🏷️ Product-quantity discount rules
* 💰 Cart-value discount rules
* 🚚 Tiered delivery-fee rules
* ⭐ Customer feedback and ratings
* 💬 Staff responses to customer feedback
* 📦 Order and order-item management
* 🔐 Authentication and authorisation
* 🛡️ Ownership and access-control checks
* 📊 Administrative sales dashboard
* 🗄️ Database-level business logic
* 🔄 Transaction and subtransaction handling
* ⚠️ Structured error handling
* 📱 Responsive frontend interface
* 🔄 Dynamic data loading without hardcoded values
* ✅ Multi-layer validation and data-integrity enforcement

---

# 🛒 CA2 Additions — Cart, Checkout & Transaction Management

CA2 extends the original Restaurant Management System with a complete **cart and checkout workflow**.

The new functionality was designed to integrate with the existing product, member, and order system while maintaining separation of responsibilities between the **frontend, backend, ORM, and database**.

The main CA2 additions are:

1. Persistent shopping carts
2. Cart-item management
3. Server-side checkout calculation
4. Product-quantity discounts
5. Cart-value discounts
6. Configurable delivery fees
7. Checkout upselling / next-tier information
8. Server-side total verification
9. Database-level order placement
10. Transaction and subtransaction handling
11. Handling of unavailable products during checkout

---

# 🗄️ New Prisma Models

CA2 introduces five additional models.

| Model                         | Purpose                                                                   |
| ----------------------------- | ------------------------------------------------------------------------- |
| `cart`                        | Stores one persistent shopping cart for each member                       |
| `cartItem`                    | Stores products and quantities currently inside a cart                    |
| `productQuantityDiscountRule` | Stores configurable quantity-based discount tiers for individual products |
| `cartValueDiscountRule`       | Stores configurable cart-value discount tiers                             |
| `deliveryFeeRule`             | Stores configurable delivery-fee rules based on order value               |

## `cart`

Each member can have **at most one cart**.

```prisma
model cart {
    cartId    Int       @id @default(autoincrement())
    memberId  Int       @unique
    createdAt DateTime? @default(now())
}
```

The `@unique` constraint on `memberId` ensures that the same member cannot have multiple cart records.

The cart is persistent rather than being recreated for every session.

---

## `cartItem`

A cart contains multiple cart items.

Each cart item represents a product currently being purchased and stores:

* Product
* Quantity
* Unit price

A composite unique constraint is used:

```prisma
@@unique([cartId, productId])
```

This prevents the same product from appearing as multiple rows within the same cart.

Instead of creating a duplicate row, the application updates the existing cart item's quantity.

### Why `subtotal` is not stored

The subtotal is derived dynamically:

```text
subtotal = quantity × unitPrice
```

Storing the subtotal separately would duplicate data that can already be calculated from existing attributes and could cause the stored value to become inconsistent when the quantity or unit price changes.

Therefore, the subtotal is calculated when required rather than persisted as a separate database attribute.

---

# 🏷️ Product Quantity Discount Rules

`productQuantityDiscountRule` stores configurable quantity-based discount tiers.

For example:

```text
Product A
├── Buy 2 → 5% discount
├── Buy 5 → 10% discount
└── Buy 10 → 15% discount
```

Each rule is associated with **one product**, while a product can have **zero or many discount rules** representing different quantity thresholds.

The checkout logic determines the **highest applicable threshold** for the quantity currently in the cart.

This allows discount tiers to be changed through database records rather than hardcoding discount values into application code.

### Example

If a product has:

| Minimum Quantity | Discount |
| ---------------: | -------: |
|                2 |       5% |
|                5 |      10% |
|               10 |      15% |

and the customer purchases 7 units, the 5-unit tier is the highest applicable tier, so the customer receives **10%**.

---

# 💰 Cart Value Discount Rules

`cartValueDiscountRule` stores discounts based on the total value of the customer's cart.

For example:

```text
Cart subtotal ≥ $50  → 5% discount
Cart subtotal ≥ $100 → 10% discount
Cart subtotal ≥ $150 → 15% discount
```

The checkout calculation identifies the highest applicable cart-value threshold.

These rules are stored separately from product-quantity rules because they represent a different type of business rule.

This avoids having one discount table containing multiple unrelated nullable attributes and keeps each table focused on its specific rule type.

---

# 🚚 Delivery Fee Rules

`deliveryFeeRule` stores configurable delivery fees based on order value.

For example:

```text
Order value < $50    → $5 delivery
Order value ≥ $50    → $2 delivery
Order value ≥ $100   → $0 delivery
```

The delivery fee is retrieved from the applicable database rule during checkout.

This means delivery pricing can be changed by modifying database records rather than changing application source code.

---

# 🛒 Cart Management

Cart functionality is implemented through:

```text
models/CartItem.js
controllers/cartItemController.js
routes/cart.js
```

The cart functionality provides CRUD operations through Prisma ORM.

### Main operations

* `getOrCreateCart`
* `createCartItem`
* `updateCartItem`
* `deleteCartItem`
* `getCartItems`
* `getCartSummary`

### Cart ownership

Every mutating cart operation verifies that the cart belongs to the authenticated member.

This prevents one member from modifying another member's cart by supplying a different `cartId`.

The ownership check is performed on the **backend**, rather than relying on the frontend to provide a valid cart.

---

# 🌐 Cart API Routes

| Method   | Endpoint                  | Description                          |
| -------- | ------------------------- | ------------------------------------ |
| `GET`    | `/cart`                   | Retrieve or obtain the member's cart |
| `GET`    | `/cart/items/:cartItemId` | Retrieve a specific cart item        |
| `POST`   | `/cart/items`             | Add a product to the cart            |
| `PUT`    | `/cart/items/:cartItemId` | Update cart-item quantity            |
| `DELETE` | `/cart/items/:cartItemId` | Remove a cart item                   |

Cart routes are protected using authentication and customer-authorisation middleware.

---

# 💳 Checkout

Checkout functionality is implemented through:

```text
models/Checkout.js
controllers/checkoutController.js
views/checkout.html
```

The checkout system calculates the customer's complete order summary before an order is placed.

### Checkout calculation includes

* Available cart items
* Unavailable cart items
* Product quantities
* Product-quantity discounts
* Cart-value discounts
* Delivery fees
* Final checkout total
* Next applicable discount tier
* Next applicable delivery tier

---

# 🧮 Server-Side Checkout Calculation

`Checkout.calculateCheckoutSummary(cartId)` acts as the **single source of truth for checkout pricing**.

The calculation is performed on the backend using database data rather than trusting values submitted by the frontend.

The process broadly follows:

```text
Cart
 ↓
Retrieve Cart Items
 ↓
Check Product Availability
 ↓
Retrieve Applicable Quantity Discounts
 ↓
Calculate Product Discounts
 ↓
Calculate Cart-Value Discount
 ↓
Determine Delivery Fee
 ↓
Calculate Final Total
 ↓
Return Checkout Summary
```

The implementation also batch-fetches applicable `productQuantityDiscountRule` records instead of querying the database separately for every cart item.

This reduces unnecessary database queries as the number of cart items increases.

---

# 🏷️ Discount Calculation

The checkout system supports two different discount mechanisms.

### 1. Product-Quantity Discount

Applied according to the quantity of a specific product.

```text
Product quantity
      ↓
Find applicable quantity tiers
      ↓
Select highest reached tier
      ↓
Apply discount to eligible product amount
```

### 2. Cart-Value Discount

Applied according to the overall cart value.

```text
Cart value
    ↓
Find applicable cart-value tier
    ↓
Select highest reached tier
    ↓
Apply cart-value discount
```

The two discount mechanisms are handled separately so that product-level and cart-level business rules remain configurable and maintainable.

---

# 🚀 Checkout Upselling

The checkout system also calculates the **next unreached pricing tier**.

For example:

```text
Current cart value: $88

Next discount tier: $100
Amount remaining: $12
```

The frontend can therefore display information such as:

```text
Spend $12 more to unlock the next discount.
```

Similar logic is used for delivery-fee thresholds.

Helper functions include:

```text
getNextProductQuantityTier()
getNextCartValueTier()
getNextDeliveryTier()
```

These functions allow the checkout interface to provide dynamic upselling information based on the current cart state.

---

# 🔐 Server-Side Total Verification

The client is **not trusted to provide the final order total**.

At the moment of order placement:

```text
OrderController.placeOrders
        ↓
Checkout.calculateCheckoutSummary()
        ↓
Recalculate current pricing
        ↓
Determine authoritative grand total
        ↓
Place order
```

This prevents a manipulated or outdated client-side total from being used as the amount stored for the order.

The total is therefore recalculated from the current database state immediately before order placement.

---

# 🧾 Order Placement

Order placement is implemented using the PostgreSQL stored procedure:

```text
place_orders(p_member_id, p_cart_id, p_grand_total, OUT p_order_id)
```

The procedure is responsible for transferring eligible cart items into the order system.

The process is:

```text
Customer clicks Checkout
        ↓
Backend recalculates checkout total
        ↓
place_orders()
        ↓
Verify cart ownership
        ↓
Process cart items
        ↓
Create sale_order
        ↓
Create sale_order_item records
        ↓
Remove successfully processed cart items
```

---

# 🔄 Transaction Management

The `place_orders` procedure uses PostgreSQL transaction behaviour and nested `BEGIN ... EXCEPTION ... END` blocks to isolate individual cart-item processing.

For each available cart item:

1. A corresponding `sale_order_item` is created.
2. The successfully processed cart item is removed.
3. If an individual item operation fails, the exception is caught.
4. The failed item is skipped.
5. Processing continues with the remaining cart items.

Conceptually:

```text
Cart Item 1
    ↓
Process successfully
    ↓
Remove from cart

Cart Item 2
    ↓
Error
    ↓
Rollback this item's work
    ↓
Keep item in cart
    ↓
Continue

Cart Item 3
    ↓
Process successfully
```

This prevents an error affecting one item from unnecessarily preventing other valid cart items from being processed.

---

# 📦 Handling Unavailable Products

The checkout process checks the current `product.is_available` value.

### Available product

The item can be transferred from:

```text
cart_item
    ↓
sale_order_item
```

and then removed from the cart.

### Unavailable product

The item is skipped and remains in the cart.

```text
cart_item
    ↓
Product unavailable
    ↓
No order item created
    ↓
Cart item remains
```

This allows customers to retain unavailable items in their cart rather than silently deleting them.

---

# 🛑 All-Items-Unavailable Scenario

If every product in the cart is unavailable:

```text
Cart
 ↓
All products unavailable
 ↓
No sale_order created
 ↓
No sale_order_item created
 ↓
Cart remains unchanged
 ↓
p_order_id = NULL
```

This prevents an empty order from being created.

---

# 🧩 Partial-Availability Scenario

If a cart contains both available and unavailable products:

```text
Cart
├── Product A → Available
├── Product B → Unavailable
└── Product C → Available
```

The procedure processes Product A and Product C while leaving Product B in the cart.

The resulting state is:

```text
SALE_ORDER
├── Product A
└── Product C

CART
└── Product B
```

This ensures unavailable products do not prevent available products from being purchased.

---

# 🔗 Database Relationships

The CA2 database extends the original relationship structure.

### Member → Cart

```text
MEMBER 1 ───── 0..1 CART
```

A member can have zero or one cart, while every cart belongs to exactly one member.

The `memberId` field in `cart` is unique, enforcing the one-cart-per-member rule.

### Cart → Cart Item

```text
CART 1 ───── 0..N CART_ITEM
```

A cart can contain zero or many cart items.

Each cart item belongs to exactly one cart.

### Product → Cart Item

```text
PRODUCT 1 ───── 0..N CART_ITEM
```

A product can appear in zero or many cart items across different carts.

Each cart item references exactly one product.

### Product → Quantity Discount Rule

```text
PRODUCT 1 ───── 0..N PRODUCT_QUANTITY_DISCOUNT_RULE
```

A product can have zero or many quantity discount tiers.

Each discount rule belongs to exactly one product.

For example, one product can have multiple thresholds:

```text
Product A
 ├── Buy 2 → 5%
 ├── Buy 5 → 10%
 └── Buy 10 → 15%
```

The customer does not receive all three discounts simultaneously. The checkout calculation selects the highest applicable tier.

### Cart Value Discount Rule

`cartValueDiscountRule` is an independent configuration table.

Each row represents a cart-value threshold and its associated discount percentage.

### Delivery Fee Rule

`deliveryFeeRule` is also an independent configuration table.

Each row defines a minimum order-value threshold and the corresponding delivery fee.

---

# 🧱 Database Design & Data Integrity

The database uses primary keys, foreign keys, unique constraints, and application/database validation to maintain data integrity.

Examples include:

### Cart ownership

```prisma
memberId Int @unique
```

Prevents multiple carts from being associated with the same member.

### Duplicate cart products

```prisma
@@unique([cartId, productId])
```

Prevents duplicate product rows inside a single cart.

### Feedback uniqueness

```prisma
@@unique([memberId, productId, orderId])
```

Prevents the same member from creating multiple feedback records for the same product and order combination.

### Foreign-key relationships

Examples include:

```text
cart.member_id → member.member_id

cart_item.cart_id → cart.cart_id

cart_item.product_id → product.product_id

sale_order_item.order_id → sale_order.order_id

sale_order_item.product_id → product.product_id

product_quantity_discount_rule.product_id
    → product.product_id
```

These relationships prevent orphaned records and maintain referential integrity.

---

# 🏗️ System Architecture

```text
┌─────────────────────────────┐
│          Frontend           │
│     HTML / CSS / JavaScript │
└──────────────┬──────────────┘
               │
               │ Fetch API
               ▼
┌─────────────────────────────┐
│          Backend            │
│   Routes / Controllers      │
└──────────────┬──────────────┘
               │
               │ Prisma ORM
               ▼
┌─────────────────────────────┐
│           Models            │
│ Product / Cart / Checkout   │
│ Feedback / Order / Member   │
└──────────────┬──────────────┘
               │
               ├──────── Prisma ORM ────────┐
               │                            │
               ▼                            ▼
┌────────────────────────────────────────────────┐
│                  PostgreSQL                    │
│ Tables / Constraints / Functions / Procedures  │
└────────────────────────────────────────────────┘
```

For CA2 cart management and checkout calculation, Prisma ORM is used for database access.

For order placement, the application invokes the PostgreSQL `place_orders` stored procedure so that the critical order-transfer operation is handled at the database level.

---

# 🔧 Backend Architecture

The backend follows a layered architecture:

```text
Routes
  ↓
Controllers
  ↓
Models
  ↓
Prisma ORM / Stored Procedures
  ↓
PostgreSQL
```

This separation keeps HTTP handling, application logic, and database operations from being unnecessarily mixed together.

---

# 📦 Models

The backend contains models for the original CA1 functionality as well as the new CA2 functionality.

| Model      | Responsibility                             |
| ---------- | ------------------------------------------ |
| `Product`  | Product information and categories         |
| `Member`   | Customer information                       |
| `Feedback` | Customer ratings and comments              |
| `Response` | Staff responses to feedback                |
| `Order`    | Customer order information                 |
| `CartItem` | Cart and cart-item operations              |
| `Checkout` | Checkout pricing and discount calculations |

CA2 introduces Prisma-based model logic for cart and checkout operations while continuing to use the existing database functionality for feedback, responses, products, and orders.

---

# 🎮 Controllers

Controllers act as the bridge between routes and models.

They are responsible for:

* Calling the appropriate model methods
* Validating request-related conditions
* Handling database responses
* Mapping database errors to HTTP status codes
* Returning structured JSON responses
* Handling expected and unexpected errors
* Enforcing authenticated access to protected operations

### CA2 Controllers

```text
cartItemController.js
checkoutController.js
```

The cart controller manages cart operations, while the checkout controller retrieves checkout summaries and coordinates order placement.

---

# 🌐 REST API Routes

## 🍔 Products

| Method | Endpoint               | Description                 |
| ------ | ---------------------- | --------------------------- |
| `GET`  | `/products/:id`        | Retrieve product details    |
| `GET`  | `/products/categories` | Retrieve product categories |

---

## 🛒 Cart

| Method   | Endpoint                  | Description                |
| -------- | ------------------------- | -------------------------- |
| `GET`    | `/cart`                   | Retrieve the member's cart |
| `GET`    | `/cart/items/:cartItemId` | Retrieve a cart item       |
| `POST`   | `/cart/items`             | Add a product to the cart  |
| `PUT`    | `/cart/items/:cartItemId` | Update cart-item quantity  |
| `DELETE` | `/cart/items/:cartItemId` | Remove a cart item         |

Protected cart routes verify authentication and customer access.

---

## 💳 Checkout

| Method | Endpoint        | Description                                |
| ------ | --------------- | ------------------------------------------ |
| `GET`  | `/checkout`     | Retrieve the checkout page                 |
| `POST` | `/orders/place` | Recalculate and place the customer's order |

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

Response editing is intentionally not required by the system specification.

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

Business logic for the original system is centralised within PostgreSQL stored procedures and functions.

CA2 additionally introduces the `place_orders` procedure for order placement and transaction management.

---

# 🧾 `place_orders`

```text
place_orders(
    p_member_id,
    p_cart_id,
    p_grand_total,
    OUT p_order_id
)
```

The procedure:

1. Verifies that the cart belongs to the requesting member.
2. Iterates through the cart items.
3. Checks product availability.
4. Creates a `sale_order` when the first available item is encountered.
5. Creates corresponding `sale_order_item` records.
6. Removes successfully processed cart items.
7. Skips unavailable products.
8. Handles individual item failures using a nested exception block.
9. Continues processing remaining cart items after an item-level failure.
10. Returns the created order ID.
11. Returns `NULL` when no available items were processed.

---

# ⭐ Dining Feedback

## `create_feedback`

Creates a new customer feedback entry.

### Validation includes

* Product existence
* Member existence
* Rating validity
* Timestamp generation

### Error codes

```text
P4040 → Product not found
P4042 → Member not found
P4000 → Invalid rating
```

---

## `update_feedback`

Updates an existing feedback entry.

### Validation includes

* Feedback existence
* Ownership verification
* Rating and comment updates
* `updated_at` timestamp

```text
P4030 → Forbidden
P4041 → Feedback not found
```

---

## `delete_feedback`

Deletes feedback after verifying ownership.

```text
P4030 → Forbidden
P4041 → Feedback not found
```

---

## `get_feedback`

Retrieves feedback submitted by a member or associated with a product.

The function joins feedback information with member information so usernames can be displayed alongside reviews.

```text
P4040 → Product not found
P4041 → No feedback found
```

---

# 💬 Feedback Responses

## `create_response`

Allows authorised staff or administrators to respond to customer feedback.

```text
P4041 → Feedback not found
```

## `get_response`

Retrieves responses associated with a feedback entry, including:

* Staff username
* Response content
* Timestamp

## `delete_response`

Allows authorised users to delete a response.

```text
P4030 → Forbidden
P4041 → Response not found
```

---

# 🧾 Orders & Products

## `get_latest_order`

Retrieves the latest order associated with a member.

This is used when creating feedback so that feedback can be associated with the relevant order.

## `get_order_statuses`

Retrieves available order statuses directly from the database.

This allows the frontend to populate status selections dynamically rather than relying on hardcoded values.

## `get_product_categories`

Retrieves available product categories from the database for dynamic frontend selection.

---

# 📊 Dashboard & Analytics

## `get_sale_order_summary`

Provides aggregated sales information for the administrator dashboard.

The summary includes:

* Total number of orders
* Total revenue
* Sales breakdown by product

The returned data powers the dashboard's charts and tables, giving administrators an overview of restaurant sales performance.

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

# 🛒 Cart Page

The cart interface allows customers to:

* View their cart
* View product information
* View quantities
* Update quantities
* Remove items
* View cart totals
* Proceed to checkout

The frontend reflects backend-computed state rather than acting as the authority for pricing or cart ownership.

---

# 💳 Checkout Page

The checkout page displays the calculated order summary.

It can show:

* Available products
* Unavailable products
* Product quantities
* Product-level discounts
* Cart-value discounts
* Delivery fees
* Final total
* Next discount tier
* Next delivery-fee tier

The checkout page retrieves current pricing information from the backend rather than calculating the authoritative total independently.

---

# ⭐ Feedback Pages

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

Responses are displayed as a separate conversation thread, making it easy to distinguish customer feedback from staff responses.

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

This provides administrators with a centralised view of both **customer sentiment and business performance**.

---

# 🔐 Authentication & Authorisation

Protected routes use authentication middleware to ensure that only authorised users can access restricted functionality.

Access control is applied to operations such as:

* Creating feedback
* Editing feedback
* Deleting feedback
* Creating responses
* Deleting responses
* Managing carts
* Updating cart items
* Accessing checkout functionality
* Accessing administrative dashboard data

### Ownership verification

Ownership checks are performed server-side before users can modify resources.

For cart operations, the backend verifies:

```text
Authenticated Member
        ↓
Requested Cart
        ↓
Does cart.member_id match authenticated member?
        ↓
Yes → Continue
No  → Reject request
```

This prevents users from manipulating another member's cart by changing identifiers in their request.

---

# ⚡ JavaScript Integration

The frontend communicates with the backend using the Fetch API.

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
Prisma ORM / Stored Procedure
     ↓
PostgreSQL
     ↓
JSON Response
     ↓
DOM Update
```

The frontend dynamically updates the page without requiring a full page reload for normal API-driven operations.

---

# 🛡️ Validation & Error Handling

Validation is implemented across multiple layers.

## Frontend

* Input validation
* Required fields
* Rating validation
* Quantity validation
* User-friendly error messages

## Backend

* Authentication
* Authorisation
* Cart ownership verification
* Request validation
* HTTP status code mapping
* Structured JSON responses
* Unexpected error handling

## Database

* Primary-key constraints
* Foreign-key constraints
* Unique constraints
* Product validation
* Member validation
* Feedback validation
* Ownership checks
* Rating validation
* Cart integrity
* Discount-rule integrity
* Order-placement logic

This layered approach prevents invalid or unauthorised operations from being accepted solely because the frontend has been manipulated.

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

Errors follow a consistent structure, allowing the frontend to identify and display failures appropriately.

Database-specific error codes are translated into suitable HTTP responses by the backend controllers.

---

# 🧪 Testing

The application was tested using both successful and failed scenarios.

## ✅ Successful Test Cases

### Existing CA1 functionality

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

### CA2 functionality

* Create or retrieve a member's cart
* Add products to cart
* Update cart quantities
* Remove cart items
* Prevent duplicate product rows in a cart
* Retrieve checkout summary
* Apply product-quantity discounts
* Apply cart-value discounts
* Determine delivery fees
* Display next applicable pricing tiers
* Place orders with available products
* Retain unavailable products in the cart
* Process carts containing both available and unavailable products
* Prevent client-supplied totals from becoming the authoritative order total

---

## ❌ Failed / Validation Test Cases

* Invalid rating
* Non-existent product
* Non-existent member
* Non-existent feedback
* Unauthorised feedback update
* Unauthorised feedback deletion
* Invalid request data
* Unauthorised cart access
* Invalid cart-item quantity
* Duplicate product in the same cart
* Unavailable product during checkout
* Cart containing only unavailable products
* Invalid cart ownership during order placement

Database error codes are translated into appropriate HTTP responses where applicable.

---

# 📁 Project Structure

```text
Restaurant-Management-System/
│
├── controllers/
│   ├── productController.js
│   ├── feedbackController.js
│   ├── responseController.js
│   ├── orderController.js
│   ├── cartItemController.js
│   └── checkoutController.js
│
├── models/
│   ├── Product.js
│   ├── Member.js
│   ├── Feedback.js
│   ├── Response.js
│   ├── Order.js
│   ├── CartItem.js
│   └── Checkout.js
│
├── routes/
│   ├── products.js
│   ├── feedback.js
│   ├── response.js
│   ├── orders.js
│   ├── dashboard.js
│   └── cart.js
│
├── database/
│   ├── functions_and_stored_procedures.sql
│
├── prisma/
│   └── schema.prisma
│
├── public/
│   ├── css/
│   ├── js/
│   └── pages/
│
└── README.txt
```

---

# 🧰 Technologies Used

| Layer            | Technologies                             |
| ---------------- | ---------------------------------------- |
| Frontend         | HTML, CSS, JavaScript                    |
| Communication    | Fetch API / AJAX                         |
| Backend          | Node.js, Express                         |
| Database         | PostgreSQL                               |
| ORM              | Prisma                                   |
| Database Logic   | PostgreSQL Functions & Stored Procedures |
| API Architecture | REST                                     |
| Authentication   | Authentication Middleware                |
| Authorisation    | Middleware + Ownership Verification      |
| Data Format      | JSON                                     |
| Validation       | Frontend + Backend + Database            |

---

# 🌟 Key Highlights

> **Configurable business rules**
> Product discounts, cart-value discounts, and delivery fees are stored as database rules instead of being hardcoded into application logic.

> **Server-authoritative checkout**
> Checkout totals are recalculated on the backend immediately before order placement rather than trusting client-supplied totals.

> **Persistent shopping carts**
> Each member has one persistent cart that can contain multiple products and can be reused across sessions.

> **Database-level transaction management**
> The `place_orders` PostgreSQL procedure handles order creation and cart-item transfer while isolating individual item failures.

> **Partial-availability handling**
> Available products can still be purchased even when other products in the cart are unavailable.

> **Secure cart ownership**
> Backend ownership checks prevent members from accessing or modifying another member's cart.

> **Normalised cart design**
> Cart subtotals are derived from quantity and unit price rather than stored redundantly, reducing the risk of inconsistent data.

> **Dynamic discount tiers**
> New product-quantity and cart-value discount thresholds can be configured through database records without changing application code.

> **Dynamic checkout upselling**
> The system identifies the next applicable discount or delivery threshold and can inform customers how much more they need to spend.

> **Layered architecture**
> Routes, controllers, models, ORM operations, and database logic are separated to improve maintainability and reduce coupling.

> **Predictable API behaviour**
> Database error codes are mapped to appropriate HTTP status codes and returned through structured JSON responses.

> **Secure resource management**
> Authentication, authorisation, and ownership checks protect sensitive operations.

> **Dynamic frontend**
> Product, category, order, cart, discount, and checkout information is retrieved dynamically rather than relying on hardcoded values.

> **Full CRUD functionality**
> Customers can create, read, update, and delete feedback, while staff can manage responses and customers can manage their carts.

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
* 🎁 More advanced promotional rule types
* 📦 Inventory quantity tracking
* 💳 Integration with an external payment gateway
* 📍 Delivery tracking
* 🧾 Customer order-history interface

---

# 👨‍💻 Project Summary

The Restaurant Management System demonstrates how a full-stack application can combine **RESTful APIs, Prisma ORM, PostgreSQL, database-level business logic, authentication, authorisation, validation, transaction management, and responsive frontend development** into a cohesive system.

The CA2 extension introduces a complete **cart, checkout, discount, delivery-fee, and order-placement workflow** while maintaining the existing feedback, response, product, order, and administrative functionality from CA1.

Particular emphasis is placed on **data integrity, server-authoritative pricing, secure resource ownership, configurable business rules, transaction safety, and separation of responsibilities** across the frontend, backend, ORM, and database layers.

The resulting architecture allows business rules such as discount thresholds and delivery fees to be modified through database configuration while keeping the application logic reusable and maintainable.