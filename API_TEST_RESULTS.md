# API Test Results

Date: 2025-06-23T01:18:55.427Z

## Summary
- Total Tests: 19
- Passed: 16
- Failed: 3

## Detailed Results

### ✅ POST /auth/register
- Status Code: 201
- Response: ```json
{
  "success": true,
  "data": {
    "user": {
      "id": 15,
      "name": "Test User",
      "email": "test1750641526985@example.com",
      "role": "both",
      "verified": false
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTUsImVtYWlsIjoidGVzdDE3NTA2NDE1MjY5ODVAZXhhbXBsZS5jb20iLCJyb2xlIjoiYm90aCIsImlhdCI6MTc1MDY0MTUyNywiZXhwIjoxNzUwNjQyNDI3fQ.aqLi4ZfADxrUGRNZQ_zgeXwmpOYNmt2pMzsmQgfk2tI",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTUsImVtYWlsIjoidGVzdDE3NTA2NDE1MjY5ODVAZXhhbXBsZS5jb20iLCJyb2xlIjoiYm90aCIsImlhdCI6MTc1MDY0MTUyNywiZXhwIjoxNzUxMjQ2MzI3fQ.-MTAabX8DZJPmbqdCWGnqGtI71brOdIhBvMvSFBhajY"
  }
}
```

### ✅ POST /auth/login
- Status Code: 200
- Response: ```json
{
  "success": true,
  "data": {
    "user": {
      "id": 15,
      "name": "Test User",
      "email": "test1750641526985@example.com",
      "role": "both",
      "avatar": null,
      "verified": 0
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTUsImVtYWlsIjoidGVzdDE3NTA2NDE1MjY5ODVAZXhhbXBsZS5jb20iLCJyb2xlIjoiYm90aCIsImlhdCI6MTc1MDY0MTUyNywiZXhwIjoxNzUwNjQyNDI3fQ.aqLi4ZfADxrUGRNZQ_zgeXwmpOYNmt2pMzsmQgfk2tI",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTUsImVtYWlsIjoidGVzdDE3NTA2NDE1MjY5ODVAZXhhbXBsZS5jb20iLCJyb2xlIjoiYm90aCIsImlhdCI6MTc1MDY0MTUyNywiZXhwIjoxNzUxMjQ2MzI3fQ.-MTAabX8DZJPmbqdCWGnqGtI71brOdIhBvMvSFBhajY"
  }
}
```

### ✅ GET /auth/me
- Status Code: 200
- Response: ```json
{
  "success": true,
  "data": {
    "user": {
      "id": 15,
      "name": "Test User",
      "email": "test1750641526985@example.com",
      "phone": "+1234567890",
      "role": "both",
      "avatar": null,
      "bio": null,
      "location": null,
      "verified": 0,
      "verification_status": "none",
      "created_at": "2025-06-22T20:18:47.000Z"
    }
  }
}
```

### ✅ POST /auth/refresh
- Status Code: 200
- Response: ```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTUsImVtYWlsIjoidGVzdDE3NTA2NDE1MjY5ODVAZXhhbXBsZS5jb20iLCJyb2xlIjoiYm90aCIsImlhdCI6MTc1MDY0MTUyOCwiZXhwIjoxNzUwNjQyNDI4fQ.sO2Qfp2E5mCn6GlBTMrP6uJCeoXeLbbJTtuVjUBy9-c",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTUsImVtYWlsIjoidGVzdDE3NTA2NDE1MjY5ODVAZXhhbXBsZS5jb20iLCJyb2xlIjoiYm90aCIsImlhdCI6MTc1MDY0MTUyOCwiZXhwIjoxNzUxMjQ2MzI4fQ.ClLVXWJ_hKorVn1W7cImQhj_adUKuvgKy6LgAYqu_o0"
  }
}
```

### ✅ POST /listings
- Status Code: 201
- Response: ```json
{
  "success": true,
  "data": {
    "id": 6
  }
}
```

### ❌ GET /listings
- Status Code: 500
- Error: Request failed with status code 500
- Details: ```json
{
  "success": false,
  "error": {
    "message": "Internal Server Error"
  }
}
```

### ❌ GET /listings/:id
- Status Code: 500
- Error: Request failed with status code 500
- Details: ```json
{
  "success": false,
  "error": {
    "message": "Internal Server Error"
  }
}
```

### ✅ PUT /listings/:id
- Status Code: 200
- Response: ```json
{
  "success": true,
  "message": "Listing updated successfully"
}
```

### ❌ GET /listings/user/:userId
- Status Code: 500
- Error: Request failed with status code 500
- Details: ```json
{
  "success": false,
  "error": {
    "message": "Internal Server Error"
  }
}
```

### ✅ POST /bookings
- Status Code: 201
- Response: ```json
{
  "success": true,
  "data": {
    "id": 5,
    "totalPrice": 110
  }
}
```

### ✅ GET /bookings
- Status Code: 200
- Response: ```json
{
  "success": true,
  "data": {
    "bookings": [
      {
        "id": 5,
        "listing_id": 6,
        "guest_id": 16,
        "host_id": 15,
        "date": "2025-06-23T19:00:00.000Z",
        "start_time": "10:00:00",
        "end_time": "12:00:00",
        "guests_count": 2,
        "total_price": "100.00",
        "service_fee": "10.00",
        "status": "pending",
        "cancelled_by": null,
        "cancellation_reason": null,
        "guest_message": "Looking forward to visiting!",
        "created_at": "2025-06-22T20:18:51.000Z",
        "updated_at": "2025-06-22T20:18:51.000Z",
        "listing_title": "Updated Test Workspace",
        "listing_location": "123 Test Street",
        "listing_image": null,
        "host_name": "Test User",
        "host_avatar": null,
        "guest_name": "Guest User",
        "guest_avatar": null
      }
    ]
  }
}
```

### ✅ GET /bookings/:id
- Status Code: 200
- Response: ```json
{
  "success": true,
  "data": {
    "booking": {
      "id": 5,
      "listing_id": 6,
      "guest_id": 16,
      "host_id": 15,
      "date": "2025-06-23T19:00:00.000Z",
      "start_time": "10:00:00",
      "end_time": "12:00:00",
      "guests_count": 2,
      "total_price": "100.00",
      "service_fee": "10.00",
      "status": "pending",
      "cancelled_by": null,
      "cancellation_reason": null,
      "guest_message": "Looking forward to visiting!",
      "created_at": "2025-06-22T20:18:51.000Z",
      "updated_at": "2025-06-22T20:18:51.000Z",
      "listing_title": "Updated Test Workspace",
      "listing_location": "123 Test Street",
      "listing_city": "Test City",
      "price_per_hour": "50.00",
      "listing_image": null,
      "host_name": "Test User",
      "host_avatar": null,
      "host_phone": "+1234567890",
      "guest_name": "Guest User",
      "guest_avatar": null,
      "guest_phone": "+9876543210"
    }
  }
}
```

### ✅ PATCH /bookings/:id/status
- Status Code: 200
- Response: ```json
{
  "success": true,
  "message": "Booking confirmed successfully"
}
```

### ✅ POST /bookings/:id/messages
- Status Code: 201
- Response: ```json
{
  "success": true,
  "data": {
    "id": 2,
    "message": "Thank you for confirming!",
    "senderId": 15,
    "createdAt": "2025-06-23T01:18:53.317Z"
  }
}
```

### ✅ GET /bookings/:id/messages
- Status Code: 200
- Response: ```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": 2,
        "booking_id": 5,
        "sender_id": 15,
        "receiver_id": 16,
        "message": "Thank you for confirming!",
        "file_url": null,
        "file_name": null,
        "file_size": null,
        "is_read": 0,
        "created_at": "2025-06-22T20:18:53.000Z",
        "sender_name": "Test User",
        "sender_avatar": null
      }
    ]
  }
}
```

### ✅ GET /messages/conversations
- Status Code: 200
- Response: ```json
{
  "success": true,
  "data": {
    "conversations": [
      {
        "booking_id": 5,
        "date": "2025-06-23T19:00:00.000Z",
        "status": "confirmed",
        "listing_id": 6,
        "listing_title": "Updated Test Workspace",
        "listing_images": [],
        "other_user_id": 16,
        "other_user_name": "Guest User",
        "other_user_avatar": null,
        "user_role": "host",
        "unread_count": 0,
        "last_message_text": "Thank you for confirming!",
        "last_message_time": "2025-06-22T20:18:53.000Z"
      }
    ]
  }
}
```

### ✅ GET /messages/unread/count
- Status Code: 200
- Response: ```json
{
  "success": true,
  "data": {
    "unreadCount": 0
  }
}
```

### ✅ DELETE /listings/:id
- Status Code: 200
- Response: ```json
{
  "success": true,
  "message": "Listing deleted successfully"
}
```

### ✅ POST /auth/logout
- Status Code: 200
- Response: ```json
{
  "success": true,
  "message": "Logged out successfully"
}
```
