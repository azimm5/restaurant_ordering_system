--
-- PostgreSQL database dump
--

\restrict 1fcNPgcYLtCijL8H2d9QvihXhkpd1HY18qvNXYAN1k9EfahyK8ZFVsflnzN42sb

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

-- Started on 2026-08-13 03:05:19

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 255 (class 1255 OID 41447)
-- Name: create_feedback(integer, integer, integer, integer, text); Type: PROCEDURE; Schema: public; Owner: -
--

CREATE PROCEDURE public.create_feedback(IN p_member_id integer, IN p_product_id integer, IN p_order_id integer, IN p_rating integer, IN p_comment text)
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Validate rating
    IF p_rating < 1 OR p_rating > 5 THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P4000', -- Bad Request
            MESSAGE = 'Rating must be between 1 and 5';
    END IF;

    -- Validate member
    IF NOT EXISTS (SELECT 1 FROM member m WHERE m.member_id = p_member_id) THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P4040', -- Member Not Found
            MESSAGE = format('Member %s not found', p_member_id);
    END IF;

    -- Validate product
    IF NOT EXISTS (SELECT 1 FROM product p WHERE p.product_id = p_product_id) THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P4041', -- Product Not Found
            MESSAGE = format('Product %s not found', p_product_id);
    END IF;

    -- Validate order
    IF NOT EXISTS (SELECT 1 FROM sale_order o WHERE o.order_id = p_order_id) THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P4042', -- Order Not Found
            MESSAGE = format('Order %s not found', p_order_id);
    END IF;

    -- Ensure order belongs to member
    IF NOT EXISTS (
        SELECT 1 FROM sale_order o
        WHERE o.order_id = p_order_id
          AND o.member_id = p_member_id
    ) THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P4030', -- Forbidden
            MESSAGE = format('Order %s does not belong to member %s',
                             p_order_id, p_member_id);
    END IF;

    -- Ensure order is completed
    IF NOT EXISTS (
        SELECT 1 FROM sale_order o
        WHERE o.order_id = p_order_id
          AND o.status = 'COMPLETED'
    ) THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P4031', -- Forbidden (order not completed)
            MESSAGE = format('Feedback can only be submitted after order %s is COMPLETED',
                             p_order_id);
    END IF;

    -- Ensure product was part of the order
    IF NOT EXISTS (
        SELECT 1 FROM sale_order_item i
        WHERE i.order_id = p_order_id
          AND i.product_id = p_product_id
    ) THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P4032', -- Forbidden (product not in order)
            MESSAGE = format('Product %s was not part of order %s',
                             p_product_id, p_order_id);
    END IF;

    -- Insert feedback with timestamps
    INSERT INTO feedback (member_id, product_id, order_id, rating, comment, created_at, updated_at)
    VALUES (p_member_id, p_product_id, p_order_id, p_rating, p_comment, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

    -- Log success
    RAISE NOTICE 'Feedback created successfully for member % on product % (order %)', 
        p_member_id, p_product_id, p_order_id;

EXCEPTION
 	WHEN unique_violation THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P4002', -- Custom code for duplicate feedback
            MESSAGE = format('You have already submitted feedback for product %s (order %s)', 
                             p_product_id, p_order_id);
    WHEN OTHERS THEN
        -- Log unexpected errors
        RAISE NOTICE 'Unexpected error creating feedback for member % on product % (order %): %',
            p_member_id, p_product_id, p_order_id, SQLERRM;
        RAISE;
END;
$$;


--
-- TOC entry 257 (class 1255 OID 41451)
-- Name: create_response(integer, integer, text); Type: PROCEDURE; Schema: public; Owner: -
--

CREATE PROCEDURE public.create_response(IN p_feedback_id integer, IN p_member_id integer, IN p_comment text)
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Check feedback exists
    IF NOT EXISTS (SELECT 1 FROM feedback WHERE feedback_id = p_feedback_id) THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P4041', -- Feedback Not Found
            MESSAGE = format('Feedback %s not found', p_feedback_id);
    END IF;

    -- Check member exists
    IF NOT EXISTS (SELECT 1 FROM member WHERE member_id = p_member_id) THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P4040', -- Member Not Found
            MESSAGE = format('Member %s not found', p_member_id);
    END IF;

    -- Prevent feedback author from responding to their own feedback
    IF EXISTS (
        SELECT 1 FROM feedback
        WHERE feedback_id = p_feedback_id
          AND member_id = p_member_id
    ) THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P4030', -- Forbidden
            MESSAGE = format(
                'Feedback author cannot respond to their own feedback (feedback_id: %s, member_id: %s)',
                p_feedback_id, p_member_id
            );
    END IF;

    -- Insert response if all checks pass
    INSERT INTO response (feedback_id, member_id, comment, created_at)
    VALUES (p_feedback_id, p_member_id, p_comment, CURRENT_TIMESTAMP);

    -- Log success
    RAISE NOTICE 'Response created successfully for feedback % by member %',
        p_feedback_id, p_member_id;

EXCEPTION
    WHEN OTHERS THEN
        -- Log unexpected errors
        RAISE NOTICE 'Unexpected error creating response for feedback % by member %: %',
            p_feedback_id, p_member_id, SQLERRM;
        RAISE;
END;
$$;


--
-- TOC entry 258 (class 1255 OID 49705)
-- Name: delete_feedback(integer, integer); Type: PROCEDURE; Schema: public; Owner: -
--

CREATE PROCEDURE public.delete_feedback(IN p_feedback_id integer, IN p_member_id integer)
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Check feedback exists
    IF NOT EXISTS (SELECT 1 FROM feedback WHERE feedback_id = p_feedback_id) THEN
		RAISE EXCEPTION USING
            ERRCODE = 'P4041', -- Feedback Not Found
            MESSAGE = format('Feedback %s not found', p_feedback_id);
    END IF;

    -- Check ownership
    IF NOT EXISTS (
        SELECT 1 FROM feedback
        WHERE feedback_id = p_feedback_id
          AND member_id = p_member_id
    ) THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P4030', -- Forbidden
            MESSAGE = format('You can only delete your own feedback (feedback_id: %s, member_id: %s)',
                             p_feedback_id, p_member_id);
    END IF;

    -- Perform delete
    DELETE FROM feedback
    WHERE feedback_id = p_feedback_id
      AND member_id = p_member_id;

    -- Log success
    RAISE NOTICE 'Feedback % deleted successfully by member %',
        p_feedback_id, p_member_id;

EXCEPTION
    WHEN OTHERS THEN
        -- Log unexpected errors
        RAISE NOTICE 'Unexpected error deleting feedback % for member %: %',
            p_feedback_id, p_member_id, SQLERRM;
        RAISE;
END;
$$;


--
-- TOC entry 264 (class 1255 OID 49696)
-- Name: delete_response(integer, integer); Type: PROCEDURE; Schema: public; Owner: -
--

CREATE PROCEDURE public.delete_response(IN p_response_id integer, IN p_member_id integer)
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Check if response exists at all
    IF NOT EXISTS (
        SELECT 1 FROM response WHERE response_id = p_response_id
    ) THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P4042', -- Response Not Found
            MESSAGE = format('Response %s not found', p_response_id);
    END IF;
	
	-- Check member exists
    IF NOT EXISTS (
	SELECT 1 FROM member WHERE member_id = p_member_id
	) THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P4040', -- Member Not Found
            MESSAGE = format('Member %s not found', p_member_id);
    END IF;
	
    -- Check if this member owns the response
    IF NOT EXISTS (
        SELECT 1 FROM response 
        WHERE response_id = p_response_id 
          AND member_id = p_member_id
    ) THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P4030', -- Forbidden
            MESSAGE = format('You can only delete your own response (response_id: %s, member_id: %s)',
                             p_response_id, p_member_id);
    END IF;

    -- Delete only if both checks passed
    DELETE FROM response 
    WHERE response_id = p_response_id
      AND member_id = p_member_id;

    -- Log success
    RAISE NOTICE 'Response % deleted successfully by member %',
        p_response_id, p_member_id;

EXCEPTION
    WHEN OTHERS THEN
        -- Log unexpected errors
        RAISE NOTICE 'Unexpected error deleting response % for member %: %',
            p_response_id, p_member_id, SQLERRM;
        RAISE;
END;
$$;


--
-- TOC entry 266 (class 1255 OID 57579)
-- Name: get_feedback(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_feedback(p_product_id integer) RETURNS TABLE(feedback_id integer, rating integer, comment text, updated_at timestamp without time zone, member_id integer, username character varying)
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Check product exists
    IF NOT EXISTS (SELECT 1 FROM product p WHERE p.product_id = p_product_id) THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P4040', -- Product Not Found
            MESSAGE = format('Product %s not found', p_product_id);
    END IF;

    -- Check feedback exists for this product
    IF NOT EXISTS (SELECT 1 FROM feedback f WHERE f.product_id = p_product_id) THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P4041', -- Feedback Not Found
            MESSAGE = format('No feedback found for product %s', p_product_id);
    END IF;

    -- Return feedback rows
    RAISE NOTICE 'Returning feedback rows for product %', p_product_id;
    RETURN QUERY
    SELECT f.feedback_id,
           f.rating,
           f.comment,
           f.updated_at,
           f.member_id,   -- include author id
           m.username
    FROM feedback f
    JOIN member m ON f.member_id = m.member_id
    WHERE f.product_id = p_product_id
    ORDER BY f.rating DESC, f.updated_at DESC;

EXCEPTION
    WHEN OTHERS THEN
        -- Log unexpected errors
        RAISE NOTICE 'Unexpected error while fetching feedback for product %: %',
            p_product_id, SQLERRM;
        RAISE;
END;
$$;


--
-- TOC entry 261 (class 1255 OID 49727)
-- Name: get_feedback_by_id(integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_feedback_by_id(p_feedback_id integer, p_member_id integer) RETURNS TABLE(feedback_id integer, product_name character varying, rating integer, comment text, updated_at timestamp without time zone)
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Validate member exists
    IF NOT EXISTS (SELECT 1 FROM member m WHERE m.member_id = p_member_id) THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P4040', -- Member Not Found
            MESSAGE = format('Member %s not found', p_member_id);
    END IF;

    -- Validate feedback exists
    IF NOT EXISTS (SELECT 1 FROM feedback f WHERE f.feedback_id = p_feedback_id) THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P4041', -- Feedback Not Found
            MESSAGE = format('Feedback %s not found', p_feedback_id);
    END IF;

    -- Validate feedback belongs to this member
    IF NOT EXISTS (
        SELECT 1 FROM feedback f
        WHERE f.feedback_id = p_feedback_id
          AND f.member_id = p_member_id
    ) THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P4030', -- Forbidden (ownership mismatch)
            MESSAGE = format('Feedback %s does not belong to member %s',
                             p_feedback_id, p_member_id);
    END IF;

    -- Return the feedback record
    RAISE NOTICE 'Returning feedback % for member %', p_feedback_id, p_member_id;
    RETURN QUERY
    SELECT f.feedback_id,
           p.name AS product_name,
           f.rating,
           f.comment,
           f.updated_at
    FROM feedback f
    JOIN product p ON f.product_id = p.product_id
    WHERE f.feedback_id = p_feedback_id
      AND f.member_id = p_member_id;

EXCEPTION
    WHEN OTHERS THEN
	        -- Log unexpected errors 
        RAISE NOTICE 'Unexpected error while fetching feedback % for member %: %',
            p_feedback_id, p_member_id, SQLERRM;
        RAISE;
END;
$$;


--
-- TOC entry 259 (class 1255 OID 49724)
-- Name: get_feedback_by_member(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_feedback_by_member(p_member_id integer) RETURNS TABLE(feedback_id integer, product_name character varying, rating integer, comment text, updated_at timestamp without time zone)
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Validate member exists
    IF NOT EXISTS (SELECT 1 FROM member m WHERE m.member_id = p_member_id) THEN
		RAISE EXCEPTION USING
            ERRCODE = 'P4040', -- Member Not Found
            MESSAGE = format('Member %s not found', p_member_id);
    END IF;

    -- Validate feedback exists
    IF NOT EXISTS (SELECT 1 FROM feedback f WHERE f.member_id = p_member_id) THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P4041', -- Feedback Not Found
            MESSAGE = format('No feedback found for member %s', p_member_id);
    END IF;

    -- Return feedback rows
    RAISE NOTICE 'Returning feedback rows for member %', p_member_id;
    RETURN QUERY
    SELECT f.feedback_id,
           p.name AS product_name,
           f.rating,
           f.comment,
           f.updated_at
    FROM feedback f
    JOIN product p ON f.product_id = p.product_id
    WHERE f.member_id = p_member_id
    ORDER BY f.rating DESC, f.updated_at DESC;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Unexpected error while fetching feedback for member %: %',
            p_member_id, SQLERRM;
        RAISE;
END;
$$;


--
-- TOC entry 262 (class 1255 OID 49726)
-- Name: get_latest_order(integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_latest_order(p_member_id integer, p_product_id integer) RETURNS TABLE(order_id integer, status character varying)
    LANGUAGE plpgsql
    AS $$
DECLARE
    latest_order RECORD;
BEGIN
    -- Validate member exists
    IF NOT EXISTS (SELECT 1 FROM member WHERE member_id = p_member_id) THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P4040', -- Member Not Found
            MESSAGE = format('Member %s not found', p_member_id);
    END IF;

    -- Validate order exists for this member and product
    IF NOT EXISTS (
        SELECT 1
        FROM sale_order so
        JOIN sale_order_item soi ON so.order_id = soi.order_id
        WHERE so.member_id = p_member_id
          AND soi.product_id = p_product_id
    ) THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P4041', -- Order Not Found
            MESSAGE = format('No order found for member %s and product %s',
                             p_member_id, p_product_id);
    END IF;

    -- Fetch the latest order
    SELECT so.order_id, so.status
    INTO latest_order
    FROM sale_order so
    JOIN sale_order_item soi ON so.order_id = soi.order_id
    WHERE so.member_id = p_member_id
      AND soi.product_id = p_product_id
    ORDER BY so.order_date DESC
    LIMIT 1;

    -- Conditional check
    IF latest_order.status <> 'COMPLETED' THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P4030', -- Forbidden (order not completed)
            MESSAGE = format('Order is %s. Only completed orders can create feedback.',
                             latest_order.status);
    ELSE
        RAISE NOTICE 'Latest order % for member % is completed.',
            latest_order.order_id, p_member_id;
        RETURN QUERY SELECT latest_order.order_id, latest_order.status;
    END IF;

EXCEPTION							 
    WHEN OTHERS THEN
        -- Log unexpected errors
        RAISE NOTICE 'Unexpected error while fetching latest order for member % and product %: %',
            p_member_id, p_product_id, SQLERRM;
        RAISE;
END;
$$;


--
-- TOC entry 256 (class 1255 OID 49736)
-- Name: get_order_statuses(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_order_statuses() RETURNS TABLE(status character varying)
    LANGUAGE sql
    AS $$
    SELECT DISTINCT status
    FROM sale_order
    ORDER BY status;
$$;


--
-- TOC entry 254 (class 1255 OID 49734)
-- Name: get_product_categories(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_product_categories() RETURNS TABLE(category character varying)
    LANGUAGE sql
    AS $$
    SELECT DISTINCT category
    FROM product
    ORDER BY category;
$$;


--
-- TOC entry 265 (class 1255 OID 57578)
-- Name: get_response(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_response(p_feedback_id integer) RETURNS TABLE(response_id integer, member_id integer, username character varying, comment text, created_at timestamp without time zone)
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Check feedback exists
    IF NOT EXISTS (SELECT 1 FROM feedback f WHERE f.feedback_id = p_feedback_id) THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P4041', -- Feedback Not Found
            MESSAGE = format('Feedback %s not found', p_feedback_id);
    END IF;

    -- Check if any responses exist
    IF NOT EXISTS (SELECT 1 FROM response r WHERE r.feedback_id = p_feedback_id) THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P4042', -- Responses Not Found
            MESSAGE = format('No responses found for feedback %s', p_feedback_id);
    END IF;

    -- Return responses
    RAISE NOTICE 'Returning responses for feedback %', p_feedback_id;
    RETURN QUERY
    SELECT r.response_id, r.member_id, m.username, r.comment, r.created_at
    FROM response r
    JOIN member m ON r.member_id = m.member_id
    WHERE r.feedback_id = p_feedback_id
    ORDER BY r.created_at DESC;

EXCEPTION
    WHEN OTHERS THEN
        -- Log unexpected errors
        RAISE NOTICE 'Unexpected error retrieving responses for feedback %: %',
            p_feedback_id, SQLERRM;
        RAISE;
END;
$$;


--
-- TOC entry 263 (class 1255 OID 49735)
-- Name: get_sale_order_summary(date, date, character varying, character varying, text, text, character varying, numeric, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_sale_order_summary(p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date, p_category character varying DEFAULT NULL::character varying, p_customer_name character varying DEFAULT NULL::character varying, p_sort_by text DEFAULT 'order_date'::text, p_sort_order text DEFAULT 'ASC'::text, p_status character varying DEFAULT NULL::character varying, p_min_amount numeric DEFAULT NULL::numeric, p_max_amount numeric DEFAULT NULL::numeric) RETURNS TABLE(order_id integer, customer_name character varying, order_date timestamp without time zone, total_amount numeric, status character varying, item_count bigint, product_list text)
    LANGUAGE plpgsql
    AS $$
	BEGIN
	    -- Validate sort order
	    IF p_sort_order NOT IN ('ASC', 'DESC') THEN
	        RAISE EXCEPTION USING
	            ERRCODE = 'P4000',
	            MESSAGE = format('Invalid sort_order: %s. Must be ASC or DESC.', p_sort_order);
	    END IF;
		
	    -- Validate sort by
	    IF p_sort_by NOT IN ('order_date', 'total_amount', 'customer_name', 'status') THEN
	        RAISE EXCEPTION USING
	            ERRCODE = 'P4040',
	            MESSAGE = format('Invalid sort_by: %s. Must be one of order_date, total_amount, customer_name, status.', p_sort_by);
	    END IF;

	    -- Validate date range
	    IF p_start_date IS NOT NULL AND p_end_date IS NOT NULL AND p_start_date > p_end_date THEN
	        RAISE EXCEPTION USING
	            ERRCODE = 'P4041',
	            MESSAGE = format('Start date (%s) cannot be after end date (%s).', p_start_date, p_end_date);
	    END IF;
	
	    RETURN QUERY
	SELECT
	    so.order_id,
	    m.username AS customer_name,
	    so.order_date,
	    SUM(i.total_price) AS total_amount,
	    so.status,
	    SUM(i.total_quantity)::BIGINT AS item_count, -- converts the result into a BIGINT integer to match the return type.
	    STRING_AGG(i.total_quantity || 'x ' || i.name, ', ' ORDER BY i.name) AS product_list
	FROM sale_order so
	JOIN member m ON so.member_id = m.member_id
	JOIN (
	    SELECT
	        soi.order_id,
	        p.name,
	        SUM(soi.quantity) AS total_quantity,
	        SUM(soi.quantity * soi.unit_price) AS total_price
	    FROM sale_order_item soi
	    JOIN product p ON soi.product_id = p.product_id
	    WHERE p_category IS NULL OR p.category = p_category
	    GROUP BY soi.order_id, p.name -- group by order and product name to collapse multiple line items into one row per product per order
	) i ON so.order_id = i.order_id
	WHERE (p_start_date IS NULL OR so.order_date >= p_start_date)
	  AND (p_end_date IS NULL OR so.order_date <= p_end_date)
	  AND (p_customer_name IS NULL OR m.username ILIKE '%' || p_customer_name || '%')
	  AND (p_status IS NULL OR so.status = p_status)               
	  
	GROUP BY so.order_id, m.username, so.order_date, so.status 
	HAVING (p_min_amount IS NULL OR SUM(i.total_price) >= p_min_amount)
      AND (p_max_amount IS NULL OR SUM(i.total_price) <= p_max_amount)
	ORDER BY
	    CASE WHEN p_sort_by = 'order_date'    AND p_sort_order = 'DESC' THEN so.order_date END DESC,
	    CASE WHEN p_sort_by = 'order_date'    AND p_sort_order = 'ASC'  THEN so.order_date END ASC,
	    CASE WHEN p_sort_by = 'total_amount'  AND p_sort_order = 'ASC'  THEN SUM(i.total_price) END ASC,
	    CASE WHEN p_sort_by = 'total_amount'  AND p_sort_order = 'DESC' THEN SUM(i.total_price) END DESC,
	    CASE WHEN p_sort_by = 'customer_name' AND p_sort_order = 'ASC'  THEN m.username END ASC,
	    CASE WHEN p_sort_by = 'customer_name' AND p_sort_order = 'DESC' THEN m.username END DESC,
	    CASE WHEN p_sort_by = 'status'        AND p_sort_order = 'ASC'  THEN so.status END ASC,
	    CASE WHEN p_sort_by = 'status'        AND p_sort_order = 'DESC' THEN so.status END DESC;
	END;
	$$;


--
-- TOC entry 267 (class 1255 OID 108175)
-- Name: place_orders(integer, integer, numeric); Type: PROCEDURE; Schema: public; Owner: -
--

CREATE PROCEDURE public.place_orders(IN p_member_id integer, IN p_cart_id integer, IN p_grand_total numeric, OUT p_order_id integer)
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_order_id INT := NULL;
    v_item RECORD;
BEGIN
    -- Default output to NULL if no available items are processed.
    p_order_id := NULL;

    -- Ensure the cart belongs to the requesting member.
    IF NOT EXISTS (
        SELECT 1
        FROM cart
        WHERE cart_id = p_cart_id
          AND member_id = p_member_id
    ) THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P4030',
            MESSAGE = format(
                'Cart %s does not belong to member %s',
                p_cart_id,
                p_member_id
            );
    END IF;

    -- Process each item in the cart individually.
    FOR v_item IN
        SELECT
            ci.cart_item_id,
            ci.product_id,
            ci.quantity,
            ci.unit_price,
            p.is_available
        FROM cart_item ci
        JOIN product p
            ON p.product_id = ci.product_id
        WHERE ci.cart_id = p_cart_id
        ORDER BY ci.cart_item_id ASC
    LOOP

        -- Only process products that are currently available.
        IF v_item.is_available THEN

            -- Create the sale order once, when the first available cart item is encountered.
            IF v_order_id IS NULL THEN
                INSERT INTO sale_order (
                    member_id,
                    order_date,
                    total_amount,
                    status
                )
                VALUES (
                    p_member_id,
                    NOW(),
                    p_grand_total,
                    'PACKING'
                )
                RETURNING order_id INTO v_order_id;
            END IF;

            -- Process this cart item in its own subtransaction.
            -- If this item fails, only this item's work is rolled back.
            BEGIN

                -- Create the corresponding sale order item.
				-- Subtotal is derived from quantity × unit price.
                INSERT INTO sale_order_item (
                    order_id,
                    product_id,
                    quantity,
                    unit_price,
                    subtotal
                )
                VALUES (
                    v_order_id,
                    v_item.product_id,
                    v_item.quantity,
                    v_item.unit_price,
                    v_item.quantity * v_item.unit_price
                );
                
                -- Remove the successfully processed item from the cart.
                DELETE FROM cart_item
                WHERE cart_item_id = v_item.cart_item_id;

            EXCEPTION
                WHEN OTHERS THEN
                    -- Roll back only this item's work and continue processing the remaining cart items.
                    RAISE NOTICE
                        'Skipped cart_item % due to error: %',
                        v_item.cart_item_id,
                        SQLERRM;
            END;

        END IF;

        -- If the product is unavailable, nothing is changed.
        -- The cart item remains in the cart and the loop continues.

    END LOOP;

    -- Remains NULL if there were no available items.
    p_order_id := v_order_id;

END;
$$;


--
-- TOC entry 260 (class 1255 OID 49716)
-- Name: update_feedback(integer, integer, integer, text); Type: PROCEDURE; Schema: public; Owner: -
--

CREATE PROCEDURE public.update_feedback(IN p_feedback_id integer, IN p_member_id integer, IN p_rating integer, IN p_comment text)
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Check feedback exists
    IF NOT EXISTS (SELECT 1 FROM feedback WHERE feedback_id = p_feedback_id) THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P4041', -- Feedback Not Found
            MESSAGE = format('Feedback %s not found', p_feedback_id);
    END IF;

    -- Check ownership
    IF NOT EXISTS (
        SELECT 1 FROM feedback
        WHERE feedback_id = p_feedback_id
          AND member_id = p_member_id
    ) THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P4030', -- Forbidden
            MESSAGE = format('You can only update your own feedback (feedback_id: %s, member_id: %s)',
                             p_feedback_id, p_member_id);
    END IF;

    -- Validate rating
    IF p_rating < 1 OR p_rating > 5 THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P4000', -- Bad Request
            MESSAGE = 'Rating must be between 1 and 5';
    END IF;

    -- Only update if values are actually different
    IF EXISTS (
        SELECT 1 FROM feedback
        WHERE feedback_id = p_feedback_id
          AND member_id = p_member_id
          AND (rating IS DISTINCT FROM p_rating OR comment IS DISTINCT FROM p_comment)
    ) THEN
        UPDATE feedback
        SET rating = p_rating,
            comment = p_comment,
            updated_at = CURRENT_TIMESTAMP
        WHERE feedback_id = p_feedback_id
          AND member_id = p_member_id;

        RAISE NOTICE 'Feedback % updated successfully by member %',
            p_feedback_id, p_member_id;
    ELSE
        -- Treat "no changes" as an error
        RAISE EXCEPTION USING
            ERRCODE = 'P4001', -- Bad Request (no changes)
            MESSAGE = format('No changes made to feedback %s by member %s',
                             p_feedback_id, p_member_id);
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        -- Log unexpected errors
        RAISE NOTICE 'Unexpected error updating feedback % for member %: %',
            p_feedback_id, p_member_id, SQLERRM;
        RAISE;
END;
$$;


--
-- TOC entry 232 (class 1259 OID 68413)
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


--
-- TOC entry 234 (class 1259 OID 74191)
-- Name: cart; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cart (
    cart_id integer NOT NULL,
    member_id integer NOT NULL,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- TOC entry 233 (class 1259 OID 74190)
-- Name: cart_cart_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cart_cart_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5178 (class 0 OID 0)
-- Dependencies: 233
-- Name: cart_cart_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cart_cart_id_seq OWNED BY public.cart.cart_id;


--
-- TOC entry 236 (class 1259 OID 74201)
-- Name: cart_item; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cart_item (
    cart_item_id integer NOT NULL,
    cart_id integer NOT NULL,
    product_id integer NOT NULL,
    quantity integer NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    CONSTRAINT cart_item_quantity_check CHECK ((quantity > 0)),
    CONSTRAINT cart_item_unit_price_check CHECK ((unit_price >= (0)::numeric))
);


--
-- TOC entry 235 (class 1259 OID 74200)
-- Name: cart_item_cart_item_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cart_item_cart_item_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5179 (class 0 OID 0)
-- Dependencies: 235
-- Name: cart_item_cart_item_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cart_item_cart_item_id_seq OWNED BY public.cart_item.cart_item_id;


--
-- TOC entry 242 (class 1259 OID 109568)
-- Name: cart_value_discount_rule; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cart_value_discount_rule (
    rule_id integer NOT NULL,
    name character varying(100) NOT NULL,
    min_cart_value numeric(10,2) NOT NULL,
    discount_percent numeric(5,2) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT cart_value_discount_percent_check CHECK (((discount_percent >= (0)::numeric) AND (discount_percent <= (100)::numeric))),
    CONSTRAINT cart_value_min_cart_value_check CHECK ((min_cart_value >= (0)::numeric))
);


--
-- TOC entry 241 (class 1259 OID 109567)
-- Name: cart_value_discount_rule_rule_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cart_value_discount_rule_rule_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5180 (class 0 OID 0)
-- Dependencies: 241
-- Name: cart_value_discount_rule_rule_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cart_value_discount_rule_rule_id_seq OWNED BY public.cart_value_discount_rule.rule_id;


--
-- TOC entry 238 (class 1259 OID 107053)
-- Name: delivery_fee_rule; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.delivery_fee_rule (
    delivery_fee_rule_id integer NOT NULL,
    min_order_value numeric(10,2) NOT NULL,
    max_order_value numeric(10,2),
    delivery_fee numeric(10,2) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT delivery_fee_amount_check CHECK ((delivery_fee >= (0)::numeric)),
    CONSTRAINT delivery_fee_max_order_value_check CHECK (((max_order_value IS NULL) OR (max_order_value >= min_order_value))),
    CONSTRAINT delivery_fee_min_order_value_check CHECK ((min_order_value >= (0)::numeric))
);


--
-- TOC entry 237 (class 1259 OID 107052)
-- Name: delivery_fee_rule_delivery_fee_rule_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.delivery_fee_rule_delivery_fee_rule_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5181 (class 0 OID 0)
-- Dependencies: 237
-- Name: delivery_fee_rule_delivery_fee_rule_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.delivery_fee_rule_delivery_fee_rule_id_seq OWNED BY public.delivery_fee_rule.delivery_fee_rule_id;


--
-- TOC entry 229 (class 1259 OID 32912)
-- Name: feedback; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feedback (
    feedback_id integer NOT NULL,
    member_id integer NOT NULL,
    product_id integer NOT NULL,
    order_id integer NOT NULL,
    rating integer NOT NULL,
    comment text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT feedback_comment_not_empty CHECK ((length(TRIM(BOTH FROM comment)) > 0)),
    CONSTRAINT feedback_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- TOC entry 228 (class 1259 OID 32911)
-- Name: feedback_feedback_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.feedback_feedback_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5182 (class 0 OID 0)
-- Dependencies: 228
-- Name: feedback_feedback_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.feedback_feedback_id_seq OWNED BY public.feedback.feedback_id;


--
-- TOC entry 219 (class 1259 OID 32823)
-- Name: member; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.member (
    member_id integer NOT NULL,
    username character varying(50) NOT NULL,
    email character varying(100) NOT NULL,
    password_hash character varying(255) NOT NULL,
    first_name character varying(50) NOT NULL,
    last_name character varying(50) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT member_email_check CHECK (((email)::text ~~ '%@%.%'::text))
);


--
-- TOC entry 220 (class 1259 OID 32835)
-- Name: member_member_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.member_member_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5183 (class 0 OID 0)
-- Dependencies: 220
-- Name: member_member_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.member_member_id_seq OWNED BY public.member.member_id;


--
-- TOC entry 221 (class 1259 OID 32836)
-- Name: member_role; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.member_role (
    member_id integer NOT NULL,
    role character varying(20) NOT NULL,
    CONSTRAINT member_role_role_check CHECK (((role)::text = ANY (ARRAY[('ADMIN'::character varying)::text, ('USER'::character varying)::text])))
);


--
-- TOC entry 222 (class 1259 OID 32842)
-- Name: product; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product (
    product_id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    price numeric(10,2) NOT NULL,
    category character varying(50),
    is_available boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT product_price_check CHECK ((price >= (0)::numeric))
);


--
-- TOC entry 223 (class 1259 OID 32852)
-- Name: product_product_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.product_product_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5184 (class 0 OID 0)
-- Dependencies: 223
-- Name: product_product_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.product_product_id_seq OWNED BY public.product.product_id;


--
-- TOC entry 240 (class 1259 OID 109553)
-- Name: product_quantity_discount_rule; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_quantity_discount_rule (
    rule_id integer NOT NULL,
    name character varying(100) NOT NULL,
    product_id integer NOT NULL,
    min_quantity integer NOT NULL,
    discount_percent numeric(5,2) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT product_qty_discount_percent_check CHECK (((discount_percent >= (0)::numeric) AND (discount_percent <= (100)::numeric))),
    CONSTRAINT product_qty_min_quantity_check CHECK ((min_quantity > 0))
);


--
-- TOC entry 239 (class 1259 OID 109552)
-- Name: product_quantity_discount_rule_rule_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.product_quantity_discount_rule_rule_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5185 (class 0 OID 0)
-- Dependencies: 239
-- Name: product_quantity_discount_rule_rule_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.product_quantity_discount_rule_rule_id_seq OWNED BY public.product_quantity_discount_rule.rule_id;


--
-- TOC entry 231 (class 1259 OID 41424)
-- Name: response; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.response (
    response_id integer NOT NULL,
    feedback_id integer NOT NULL,
    member_id integer NOT NULL,
    comment text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT response_comment_not_empty CHECK ((length(TRIM(BOTH FROM comment)) > 0))
);


--
-- TOC entry 230 (class 1259 OID 41423)
-- Name: response_response_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.response_response_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5186 (class 0 OID 0)
-- Dependencies: 230
-- Name: response_response_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.response_response_id_seq OWNED BY public.response.response_id;


--
-- TOC entry 224 (class 1259 OID 32853)
-- Name: sale_order; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sale_order (
    order_id integer NOT NULL,
    member_id integer,
    order_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    total_amount numeric(10,2) NOT NULL,
    status character varying(20) NOT NULL,
    delivery_address text,
    CONSTRAINT sale_order_status_check CHECK (((status)::text = ANY (ARRAY[('COMPLETED'::character varying)::text, ('CANCELLED'::character varying)::text, ('PACKING'::character varying)::text]))),
    CONSTRAINT sale_order_total_amount_check CHECK ((total_amount >= (0)::numeric))
);


--
-- TOC entry 225 (class 1259 OID 32863)
-- Name: sale_order_item; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sale_order_item (
    order_item_id integer NOT NULL,
    order_id integer,
    product_id integer,
    quantity integer NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    subtotal numeric(10,2) NOT NULL,
    CONSTRAINT sale_order_item_quantity_check CHECK ((quantity > 0)),
    CONSTRAINT sale_order_item_subtotal_check CHECK ((subtotal >= (0)::numeric)),
    CONSTRAINT sale_order_item_unit_price_check CHECK ((unit_price >= (0)::numeric))
);


--
-- TOC entry 226 (class 1259 OID 32871)
-- Name: sale_order_item_order_item_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sale_order_item_order_item_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5187 (class 0 OID 0)
-- Dependencies: 226
-- Name: sale_order_item_order_item_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sale_order_item_order_item_id_seq OWNED BY public.sale_order_item.order_item_id;


--
-- TOC entry 227 (class 1259 OID 32872)
-- Name: sale_order_order_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sale_order_order_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5188 (class 0 OID 0)
-- Dependencies: 227
-- Name: sale_order_order_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sale_order_order_id_seq OWNED BY public.sale_order.order_id;


--
-- TOC entry 4943 (class 2604 OID 74194)
-- Name: cart cart_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart ALTER COLUMN cart_id SET DEFAULT nextval('public.cart_cart_id_seq'::regclass);


--
-- TOC entry 4945 (class 2604 OID 74204)
-- Name: cart_item cart_item_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_item ALTER COLUMN cart_item_id SET DEFAULT nextval('public.cart_item_cart_item_id_seq'::regclass);


--
-- TOC entry 4952 (class 2604 OID 109571)
-- Name: cart_value_discount_rule rule_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_value_discount_rule ALTER COLUMN rule_id SET DEFAULT nextval('public.cart_value_discount_rule_rule_id_seq'::regclass);


--
-- TOC entry 4946 (class 2604 OID 107056)
-- Name: delivery_fee_rule delivery_fee_rule_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_fee_rule ALTER COLUMN delivery_fee_rule_id SET DEFAULT nextval('public.delivery_fee_rule_delivery_fee_rule_id_seq'::regclass);


--
-- TOC entry 4936 (class 2604 OID 32915)
-- Name: feedback feedback_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback ALTER COLUMN feedback_id SET DEFAULT nextval('public.feedback_feedback_id_seq'::regclass);


--
-- TOC entry 4928 (class 2604 OID 32873)
-- Name: member member_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member ALTER COLUMN member_id SET DEFAULT nextval('public.member_member_id_seq'::regclass);


--
-- TOC entry 4930 (class 2604 OID 32874)
-- Name: product product_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product ALTER COLUMN product_id SET DEFAULT nextval('public.product_product_id_seq'::regclass);


--
-- TOC entry 4949 (class 2604 OID 109556)
-- Name: product_quantity_discount_rule rule_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_quantity_discount_rule ALTER COLUMN rule_id SET DEFAULT nextval('public.product_quantity_discount_rule_rule_id_seq'::regclass);


--
-- TOC entry 4939 (class 2604 OID 41427)
-- Name: response response_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.response ALTER COLUMN response_id SET DEFAULT nextval('public.response_response_id_seq'::regclass);


--
-- TOC entry 4933 (class 2604 OID 32875)
-- Name: sale_order order_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_order ALTER COLUMN order_id SET DEFAULT nextval('public.sale_order_order_id_seq'::regclass);


--
-- TOC entry 4935 (class 2604 OID 32876)
-- Name: sale_order_item order_item_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_order_item ALTER COLUMN order_item_id SET DEFAULT nextval('public.sale_order_item_order_item_id_seq'::regclass);


--
-- TOC entry 5000 (class 2606 OID 68426)
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- TOC entry 5006 (class 2606 OID 74212)
-- Name: cart_item cart_item_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_item
    ADD CONSTRAINT cart_item_pkey PRIMARY KEY (cart_item_id);


--
-- TOC entry 5003 (class 2606 OID 74199)
-- Name: cart cart_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart
    ADD CONSTRAINT cart_pkey PRIMARY KEY (cart_id);


--
-- TOC entry 5012 (class 2606 OID 109580)
-- Name: cart_value_discount_rule cart_value_discount_rule_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_value_discount_rule
    ADD CONSTRAINT cart_value_discount_rule_pkey PRIMARY KEY (rule_id);


--
-- TOC entry 5008 (class 2606 OID 107064)
-- Name: delivery_fee_rule delivery_fee_rule_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_fee_rule
    ADD CONSTRAINT delivery_fee_rule_pkey PRIMARY KEY (delivery_fee_rule_id);


--
-- TOC entry 4994 (class 2606 OID 32925)
-- Name: feedback feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback
    ADD CONSTRAINT feedback_pkey PRIMARY KEY (feedback_id);


--
-- TOC entry 4996 (class 2606 OID 49738)
-- Name: feedback feedback_unique_member_product_order; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback
    ADD CONSTRAINT feedback_unique_member_product_order UNIQUE (member_id, product_id, order_id);


--
-- TOC entry 4976 (class 2606 OID 32878)
-- Name: member member_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member
    ADD CONSTRAINT member_email_key UNIQUE (email);


--
-- TOC entry 4978 (class 2606 OID 32880)
-- Name: member member_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member
    ADD CONSTRAINT member_pkey PRIMARY KEY (member_id);


--
-- TOC entry 4982 (class 2606 OID 57582)
-- Name: member_role member_role_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_role
    ADD CONSTRAINT member_role_pkey PRIMARY KEY (member_id);


--
-- TOC entry 4980 (class 2606 OID 32884)
-- Name: member member_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member
    ADD CONSTRAINT member_username_key UNIQUE (username);


--
-- TOC entry 4984 (class 2606 OID 57535)
-- Name: product product_name_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product
    ADD CONSTRAINT product_name_unique UNIQUE (name);


--
-- TOC entry 4986 (class 2606 OID 32886)
-- Name: product product_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product
    ADD CONSTRAINT product_pkey PRIMARY KEY (product_id);


--
-- TOC entry 5010 (class 2606 OID 109566)
-- Name: product_quantity_discount_rule product_quantity_discount_rule_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_quantity_discount_rule
    ADD CONSTRAINT product_quantity_discount_rule_pkey PRIMARY KEY (rule_id);


--
-- TOC entry 4998 (class 2606 OID 41436)
-- Name: response response_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.response
    ADD CONSTRAINT response_pkey PRIMARY KEY (response_id);


--
-- TOC entry 4992 (class 2606 OID 32888)
-- Name: sale_order_item sale_order_item_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_order_item
    ADD CONSTRAINT sale_order_item_pkey PRIMARY KEY (order_item_id);


--
-- TOC entry 4988 (class 2606 OID 57538)
-- Name: sale_order sale_order_member_date_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_order
    ADD CONSTRAINT sale_order_member_date_unique UNIQUE (member_id, order_date);


--
-- TOC entry 4990 (class 2606 OID 32890)
-- Name: sale_order sale_order_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_order
    ADD CONSTRAINT sale_order_pkey PRIMARY KEY (order_id);


--
-- TOC entry 5004 (class 1259 OID 98843)
-- Name: cart_item_cart_product_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX cart_item_cart_product_unique ON public.cart_item USING btree (cart_id, product_id);


--
-- TOC entry 5001 (class 1259 OID 98842)
-- Name: cart_member_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX cart_member_id_key ON public.cart USING btree (member_id);


--
-- TOC entry 5023 (class 2606 OID 74218)
-- Name: cart_item cart_item_cart_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_item
    ADD CONSTRAINT cart_item_cart_id_fk FOREIGN KEY (cart_id) REFERENCES public.cart(cart_id) ON DELETE CASCADE;


--
-- TOC entry 5024 (class 2606 OID 74223)
-- Name: cart_item cart_item_product_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_item
    ADD CONSTRAINT cart_item_product_id_fk FOREIGN KEY (product_id) REFERENCES public.product(product_id);


--
-- TOC entry 5022 (class 2606 OID 74213)
-- Name: cart cart_member_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart
    ADD CONSTRAINT cart_member_id_fk FOREIGN KEY (member_id) REFERENCES public.member(member_id);


--
-- TOC entry 5017 (class 2606 OID 57608)
-- Name: feedback fk_member; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback
    ADD CONSTRAINT fk_member FOREIGN KEY (member_id) REFERENCES public.member(member_id);


--
-- TOC entry 5018 (class 2606 OID 57613)
-- Name: feedback fk_order; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback
    ADD CONSTRAINT fk_order FOREIGN KEY (order_id) REFERENCES public.sale_order(order_id);


--
-- TOC entry 5019 (class 2606 OID 57618)
-- Name: feedback fk_product; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback
    ADD CONSTRAINT fk_product FOREIGN KEY (product_id) REFERENCES public.product(product_id);


--
-- TOC entry 5013 (class 2606 OID 57628)
-- Name: member_role member_role_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_role
    ADD CONSTRAINT member_role_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.member(member_id);


--
-- TOC entry 5025 (class 2606 OID 109581)
-- Name: product_quantity_discount_rule product_qty_rule_product_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_quantity_discount_rule
    ADD CONSTRAINT product_qty_rule_product_id_fk FOREIGN KEY (product_id) REFERENCES public.product(product_id) ON DELETE CASCADE;


--
-- TOC entry 5020 (class 2606 OID 57593)
-- Name: response response_feedback_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.response
    ADD CONSTRAINT response_feedback_id_fkey FOREIGN KEY (feedback_id) REFERENCES public.feedback(feedback_id) ON DELETE CASCADE;


--
-- TOC entry 5021 (class 2606 OID 57588)
-- Name: response response_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.response
    ADD CONSTRAINT response_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.member(member_id);


--
-- TOC entry 5015 (class 2606 OID 57523)
-- Name: sale_order_item sale_order_item_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_order_item
    ADD CONSTRAINT sale_order_item_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.sale_order(order_id) ON DELETE CASCADE;


--
-- TOC entry 5016 (class 2606 OID 57603)
-- Name: sale_order_item sale_order_item_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_order_item
    ADD CONSTRAINT sale_order_item_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.product(product_id);


--
-- TOC entry 5014 (class 2606 OID 57623)
-- Name: sale_order sale_order_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_order
    ADD CONSTRAINT sale_order_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.member(member_id);


-- Completed on 2026-08-13 03:05:19

--
-- PostgreSQL database dump complete
--

\unrestrict 1fcNPgcYLtCijL8H2d9QvihXhkpd1HY18qvNXYAN1k9EfahyK8ZFVsflnzN42sb

