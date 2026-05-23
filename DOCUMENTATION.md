# CoRideHub — Complete Project Documentation

---

## Table of Contents

1. [Title Page & Project Info](#1-title-page--project-info)
2. [Abstract](#2-abstract)
3. [Case Study](#3-case-study)
4. [Statement of Problem](#4-statement-of-problem)
5. [Aim and Objectives](#5-aim-and-objectives)
6. [Scope of the Project](#6-scope-of-the-project)
7. [System Architecture Overview](#7-system-architecture-overview)
8. [Technology Stack](#8-technology-stack)
9. [Functional Requirements](#9-functional-requirements)
10. [Non-Functional Requirements](#10-non-functional-requirements)
11. [Database Design](#11-database-design)
12. [Backend API Documentation](#12-backend-api-documentation)
13. [Frontend Architecture](#13-frontend-architecture)
14. [Real-Time Features & Socket Architecture](#14-real-time-features--socket-architecture)
15. [Native Location Tracking Module](#15-native-location-tracking-module)
16. [Security Implementation](#16-security-implementation)
17. [User Manual — Rider (User)](#17-user-manual--rider-user)
18. [User Manual — Driver (Provider)](#18-user-manual--driver-provider)
19. [System Data Flow Diagrams](#19-system-data-flow-diagrams)
20. [Limitations](#20-limitations)
21. [Future Work & Recommendations](#21-future-work--recommendations)
22. [Conclusion](#22-conclusion)
23. [Summary A–Z](#23-summary-az)
24. [Glossary](#24-glossary)

---

## 1. Title Page & Project Info

```
╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║                         C O R I D E H U B                        ║
║                                                                  ║
║         A Real-Time Ride-Sharing & Route Tracking Platform       ║
║                  for Cross-City Commuters                        ║
║                                                                  ║
╠══════════════════════════════════════════════════════════════════╣
║  Project Name    : CoRideHub                                     ║
║  Platform        : Android & iOS (React Native)                  ║
║  Backend         : Node.js / Express / MongoDB                   ║
║  Version         : 1.0.0                                         ║
║  Repository      : CoRideHub (private)                           ║
║  Developer       : Molabux                                       ║
║  Date            : May 2026                                      ║
╚══════════════════════════════════════════════════════════════════╝
```

---

## 2. Abstract

CoRideHub is a cross-platform mobile application built with React Native that connects daily commuters with private vehicle owners (providers) who travel along defined routes. The platform digitises the informal carpooling economy that exists in many cities — where drivers and passengers physically negotiate ride-sharing near bus stops or traffic junctions — into a structured, safe, and trackable digital experience.

The system allows providers to register routes with GPS-pinned start and end points plus named intermediate stops, announce real-time departures, and accept or reject incoming ride requests from users. Riders can discover nearby active routes, book seats, and track the driver's live GPS position in real-time on a map, even when the driver's phone is in the background or the application process has been killed by the operating system.

Key technical achievements include a **native Android foreground service** and **iOS background CLLocationManager** that continue pushing location to the server independently of the JavaScript runtime, a **Socket.IO room-based fan-out** that delivers sub-second updates to all subscribed riders, and a **distance-threshold emission strategy** that fires location events only when the driver moves ≥ 15 metres rather than on a fixed timer, eliminating GPS-jitter noise while preserving low latency.

---

## 3. Case Study

### 3.1 Background

In many developing and semi-developed urban regions, a significant portion of the daily commuting population relies on informal shared transport: private car owners who travel a fixed route every day and informally pick up passengers along the way, splitting fuel costs or charging a modest fare. This informal economy is massive but entirely unorganised — riders stand at known pick-up spots with no visibility into when a driver will arrive, and drivers have no reliable way to announce their departure or fill their remaining seats.

Platforms like Uber and Careem solve a different problem: on-demand taxi dispatch. They are designed for variable routes, surge pricing, and professional drivers. They are not designed for the daily commuter who travels the same 40-kilometre highway every morning and evening and wants to share the cost of that fixed trip with three neighbours.

### 3.2 The Real-World Problem

**Karachi, Lahore, Islamabad** (and cities of similar density) share this pattern:

- A private car owner commutes daily from Clifton to Gulshan.
- Three colleagues in the same neighbourhood could join the trip.
- Today, they coordinate entirely via WhatsApp groups, phone calls, or standing at a known corner.
- If the driver is five minutes away, passengers have no way of knowing — they simply wait.
- If a passenger's plans change, the driver wastes time waiting at a stop.
- There is no record, no accountability, and no safety mechanism.

### 3.3 The CoRideHub Solution

CoRideHub digitises this workflow:

1. The driver registers their vehicle and creates a named route (e.g., "Clifton → Gulshan via Tariq Road") with GPS coordinates for the start, end, and each intermediate stop.
2. Each morning before leaving, the driver announces a departure time on the app. The route becomes "active/leaving."
3. Riders who commute along that corridor search by their pickup and drop-off GPS coordinates. The system uses a Haversine proximity formula to match their location to active routes within a configurable radius.
4. A rider books a seat on a matching route, choosing their specific pickup stop and drop-off stop.
5. The driver receives the request and approves or rejects it.
6. Once approved, the rider opens a live tracking map that shows the driver's car moving in real-time, updated with sub-second latency via WebSocket.
7. The system automatically tracks seat occupancy — when a seat is filled, the count decrements; when the rider is fully booked out, new requests are blocked.

### 3.4 Target Audience

| Segment | Description |
|---|---|
| Daily Commuters | Office workers, university students traveling fixed routes daily |
| Private Car Owners | Vehicle owners willing to share trips for cost-recovery or community benefit |
| Corporate Employees | Companies with clusters of employees in shared residential areas |
| University Students | Students traveling from specific residential zones to a campus |

### 3.5 Market Differentiation

| Feature | CoRideHub | Uber/Careem | WhatsApp Groups |
|---|---|---|---|
| Fixed route model | ✅ | ❌ | ✅ (manual) |
| Real-time GPS tracking | ✅ | ✅ | ❌ |
| Seat management | ✅ | ❌ (N/A) | ❌ |
| Background GPS (kill state) | ✅ | ✅ | ❌ |
| Structured stop selection | ✅ | ❌ | ❌ |
| Free to use | ✅ | ❌ | ✅ |
| Digital ride history | ✅ | ✅ | ❌ |

---

## 4. Statement of Problem

### 4.1 Primary Problem

There is no structured digital platform designed specifically for **fixed-route daily carpooling** in South Asian urban markets. Existing solutions either address on-demand taxi dispatch (not fixed-route commuting) or leave coordination entirely to informal channels (WhatsApp, phone calls), which provide no real-time visibility, no accountability, and no safety record.

### 4.2 Specific Pain Points

**For Riders:**
- No way to know if a carpool driver is on their way or has already departed.
- No visibility into driver location while waiting at a stop.
- No record of past rides or drivers for accountability.
- No mechanism to book a seat in advance.
- Cannot check seat availability before making plans.

**For Drivers (Providers):**
- No structured way to announce departure to multiple passengers simultaneously.
- No ability to manage which passengers are approved for their vehicle.
- Cannot see incoming ride requests in an organised interface.
- No digital record of passengers carried.
- Seat capacity managed entirely by memory.

**For the Ecosystem:**
- No accountability layer: no ride history, no driver identification, no approval process.
- No way to enforce seat limits digitally.
- No safety audit trail in case of disputes.

### 4.3 Technical Challenges Solved

Beyond the business problem, CoRideHub solves several significant **technical challenges** in mobile application development:

1. **Background GPS on mobile** — both Android and iOS aggressively suspend background applications to save battery. Standard JavaScript-based GPS via `navigator.geolocation` stops working the moment the app is backgrounded. CoRideHub implements a native Android Foreground Service (Kotlin) and an iOS background CLLocationManager (Swift) that continue tracking the driver's location even after the app is minimised, the screen locks, or the process is killed by the OS.

2. **Kill-state HTTP fallback** — if the Android process is killed and restarted by the OS (START_STICKY), the native service reads auth credentials from SharedPreferences (written before tracking started) and continues posting location updates via direct HTTP calls — completely bypassing the JavaScript runtime.

3. **Real-time location fan-out** — driver location must be delivered to potentially many riders simultaneously with minimal latency. The system uses Socket.IO rooms so a single driver emit is immediately forwarded to all connected riders in that route room without broadcasting to the entire server.

4. **Distance-threshold emission** — emitting location on every GPS tick regardless of movement causes both unnecessary network traffic and "jumpy" map markers from GPS noise. The system only emits via socket when the driver has moved ≥ 15 metres from the last emitted position, with a 4-second heartbeat fallback to confirm the tracking is alive.

---

## 5. Aim and Objectives

### 5.1 Aim

To design, build, and deploy a full-stack mobile ride-sharing platform that enables private car owners to offer structured fixed-route carpools to daily commuters, with real-time GPS tracking, seat management, and live ride-status updates, operating reliably across foreground, background, and post-kill application states.

### 5.2 Objectives

#### Primary Objectives

1. **User Authentication System**
   - Allow new users to register as either a Rider or Provider.
   - Implement secure JWT-based authentication with bcrypt password hashing.
   - Persist authentication state across app restarts using AsyncStorage.

2. **Provider Route Management**
   - Allow providers to create named routes with GPS-pinned origin, destination, and multiple named stops.
   - Allow providers to add scheduled departure times.
   - Allow providers to toggle "leaving now" status to make a route active.
   - Allow providers to complete a departure, resetting location and seat state.

3. **Rider Route Discovery**
   - Implement a proximity-based route search using the Haversine formula.
   - Allow riders to search by their current pickup location and desired drop-off.
   - Display matching routes with distance-to-pickup and distance-to-dropoff indicators.
   - Show seat availability on each route card.

4. **Ride Booking System**
   - Allow riders to select a specific pickup stop and drop-off stop from a route's stop list.
   - Submit a ride request that enters a Pending state.
   - Prevent riders from submitting multiple concurrent ride requests.
   - Enforce seat availability check at the point of request.

5. **Driver Approval Workflow**
   - Allow the driver to view incoming ride requests on their dashboard.
   - Allow the driver to approve or reject each request individually.
   - On approval, decrement the route's seatsLeft count.
   - On rejection, no change to seat count.
   - Push real-time ride status updates to the rider via socket.

6. **Live GPS Tracking**
   - Track driver location via native modules (Android Foreground Service / iOS CLLocationManager).
   - Stream location to the backend via Socket.IO on significant coordinate changes (≥ 15 m movement).
   - Display driver location on a Mapbox map for approved riders.
   - Continue tracking when app is minimised, screen locked, or process restarted.

7. **Ride History**
   - Provide riders with a complete history of all past rides.
   - Show the 2 most recent completed/rejected rides on the dashboard.
   - Provide a "See All" navigation to a full ride-history screen.

8. **Saved Places**
   - Allow riders to save frequently used locations with a custom label.
   - Surface saved places on the dashboard for quick selection.

9. **Vehicle Registration**
   - Require providers to register their vehicle (type, model, plate number, capacity).
   - Use vehicle capacity to initialise seat availability on routes.

#### Secondary Objectives

10. Support both Android and iOS platforms from a single codebase.
11. Implement ETA estimation from driver position to rider pickup point.
12. Handle network disconnection and socket reconnection gracefully.
13. Provide clear status feedback at every stage of the ride lifecycle.

---

## 6. Scope of the Project

### 6.1 In Scope

- Mobile applications for Android (API 24+) and iOS (iOS 14+)
- Two user roles: Rider and Provider (Driver)
- Route creation and management by providers
- Proximity-based route discovery for riders
- Ride booking, approval/rejection workflow
- Live GPS tracking (foreground, background, kill state on Android)
- Real-time ride status updates via WebSocket
- Seat availability tracking
- Ride history for riders
- Saved places for riders
- Vehicle registration for providers
- JWT authentication and protected API endpoints
- Mapbox map integration for live tracking

### 6.2 Out of Scope (v1.0)

- Payment processing or in-app fare collection
- Driver rating and review system
- Push notification system (FCM/APNs)
- Admin dashboard / moderation panel
- Driver earnings analytics
- Chat messaging between driver and rider
- SOS / emergency feature
- Multi-language (i18n) support
- Offline mode / local data caching
- iOS kill-state GPS restart (iOS does not provide START_STICKY equivalent)

---

## 7. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
│                                                                 │
│  ┌───────────────────────┐    ┌───────────────────────────────┐ │
│  │   React Native App    │    │   Native Modules              │ │
│  │                       │    │                               │ │
│  │  • Zustand Stores     │    │  Android:                     │ │
│  │  • React Navigation   │◄──►│   LocationService.kt          │ │
│  │  • Axios (REST)       │    │   LocationModule.kt           │ │
│  │  • Socket.IO Client   │    │  iOS:                         │ │
│  │  • Mapbox Maps        │    │   LocationModule.swift        │ │
│  │  • Formik/Yup         │    │   LocationModule.m            │ │
│  └──────────┬────────────┘    └───────────────────────────────┘ │
└─────────────┼───────────────────────────────────────────────────┘
              │  REST (HTTP/HTTPS)  +  WebSocket (Socket.IO)
              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       SERVER LAYER                               │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                   Express.js API Server                    │ │
│  │                                                            │ │
│  │  Routes:          Controllers:       Middleware:           │ │
│  │  /api/auth    →   authController     authMiddleware        │ │
│  │  /api/routes  →   routeController    (JWT verification)    │ │
│  │  /api/rides   →   rideController                           │ │
│  │  /api/places  →   placeController                          │ │
│  │  /api/stops   →   stopController                           │ │
│  │  /api/vehicle →   vehicleController                        │ │
│  │  /api/location→   routeController                          │ │
│  │                          ▲                                 │ │
│  │                   ┌──────┴──────┐                          │ │
│  │                   │  Socket.IO  │                          │ │
│  │                   │  Rooms:     │                          │ │
│  │                   │  route:{id} │                          │ │
│  │                   │  user:{id}  │                          │ │
│  │                   └─────────────┘                          │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────┬───────────────────────────────────┘
                              │  Mongoose ODM
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       DATABASE LAYER                             │
│                                                                  │
│                      MongoDB Atlas / Local                       │
│                                                                  │
│  Collections:  users · routes · stops · rides · places          │
│                vehicles                                          │
└─────────────────────────────────────────────────────────────────┘
```

### 7.1 Request Lifecycle

```
Rider opens app
  → useAuthStore hydrates from AsyncStorage
  → Axios interceptor injects Bearer token on all requests
  → Rider searches routes → GET /api/routes/search
  → Server runs Haversine filter → returns matched routes
  → Rider selects route → POST /api/rides (creates Pending ride)
  → Driver receives request → GET /api/rides/requests
  → Driver approves → PATCH /api/rides/:id/request-status { status: Approved }
  → Server decrements route.seatsLeft → emits ride:update to user:{riderId} room
  → Rider's RideDetails screen receives socket event → UI updates
  → Driver starts journey → LocationModule.startTracking()
  → GPS fires → trackingService.js → socket emit driver-location
  → Server relays to route:{routeId} room → Rider's map updates
```

---

## 8. Technology Stack

### 8.1 Frontend (Mobile App)

| Category | Technology | Version | Purpose |
|---|---|---|---|
| Framework | React Native | 0.85.2 | Cross-platform mobile UI |
| Language | JavaScript (ES2022+) | — | Application logic |
| Navigation | React Navigation Native Stack | 7.x | Screen routing |
| State Management | Zustand | 5.0.12 | Global state (auth, session) |
| HTTP Client | Axios | 1.8.4 | REST API calls with JWT interceptor |
| Real-time | Socket.IO Client | 4.8.3 | WebSocket connection to server |
| Maps | Mapbox (@rnmapbox/maps) | 10.3.0 | Driver live location display |
| Forms | Formik + Yup | 2.4.9 / 1.7.1 | Form state and validation |
| Persistence | AsyncStorage | 2.1.2 | Token and auth state storage |
| Permissions | react-native-permissions | 5.5.1 | Location permission handling |
| Icons | Material Design Icons | 13.1.1 | UI icons |
| Geolocation (legacy) | @react-native-community/geolocation | 3.4.0 | App-level coarse location |

### 8.2 Native Modules

| Platform | File | Technology | Purpose |
|---|---|---|---|
| Android | LocationService.kt | Kotlin / FusedLocationProviderClient | Foreground Service GPS tracking |
| Android | LocationModule.kt | Kotlin / React Native Bridge | JS ↔ Native bridge |
| iOS | LocationModule.swift | Swift / CLLocationManager | Background location tracking |
| iOS | LocationModule.m | Objective-C | Swift ↔ React Native bridge declaration |

### 8.3 Backend

| Category | Technology | Version | Purpose |
|---|---|---|---|
| Runtime | Node.js | ≥ 18.0 | Server runtime |
| Framework | Express.js | 4.18.2 | HTTP routing and middleware |
| Database | MongoDB | — | Document store |
| ODM | Mongoose | 8.0.0 | Schema modeling and queries |
| Authentication | JSON Web Tokens | 9.0.2 | Stateless auth tokens |
| Password Hashing | bcryptjs | 2.4.3 | Secure password storage |
| Real-time | Socket.IO | 4.8.3 | WebSocket server |
| Environment | dotenv | 16.3.1 | Env variable management |
| CORS | cors | 2.8.5 | Cross-origin request handling |
| Dev Tool | nodemon | 3.0.1 | Auto-restart in development |

---

## 9. Functional Requirements

### 9.1 Authentication Module

| ID | Requirement | Priority |
|---|---|---|
| FR-01 | Users shall register with name, email, phone, password, and role (rider/provider) | High |
| FR-02 | Providers shall be required to register a vehicle after signup | High |
| FR-03 | Users shall log in with email and password | High |
| FR-04 | Auth token shall persist across app restarts | High |
| FR-05 | Users shall be redirected to role-appropriate dashboard | High |
| FR-06 | Users shall be able to log out, clearing all auth state | High |

### 9.2 Provider / Route Module

| ID | Requirement | Priority |
|---|---|---|
| FR-07 | Provider shall create a route with name, GPS-pinned origin, GPS-pinned destination | High |
| FR-08 | Provider shall add named intermediate stops to a route | High |
| FR-09 | Provider shall add scheduled departure times (date + time) | Medium |
| FR-10 | Provider shall toggle "leaving now" to activate a route departure | High |
| FR-11 | Provider shall mark a departure as complete, resetting driver location | High |
| FR-12 | Provider shall view all their routes on a dedicated screen | High |
| FR-13 | Provider shall delete a route (and all its associated stops) | Medium |

### 9.3 Rider / Discovery Module

| ID | Requirement | Priority |
|---|---|---|
| FR-14 | Rider shall search for routes by providing pickup and drop-off coordinates | High |
| FR-15 | Search results shall be filtered by configurable radius (default 5 km) | High |
| FR-16 | Search results shall display distance to pickup and distance to drop-off | Medium |
| FR-17 | Search results shall display available seats for each route | High |
| FR-18 | Rider shall not see full routes (seatsLeft = 0) in a bookable state | High |

### 9.4 Booking Module

| ID | Requirement | Priority |
|---|---|---|
| FR-19 | Rider shall select a pickup stop and drop-off stop from the route's stop list | High |
| FR-20 | System shall reject booking if rider already has an active ride | High |
| FR-21 | System shall reject booking if route has no seats left | High |
| FR-22 | Ride shall be created in Pending status | High |
| FR-23 | Driver shall receive new ride requests in their dashboard | High |
| FR-24 | Driver shall approve or reject a request | High |
| FR-25 | On approval, seatsLeft shall decrement by 1 | High |
| FR-26 | Rider shall receive real-time notification of status change | High |

### 9.5 Tracking Module

| ID | Requirement | Priority |
|---|---|---|
| FR-27 | Driver location shall be tracked via native GPS module | High |
| FR-28 | Driver location shall continue updating when app is minimised | High |
| FR-29 | Driver location shall continue updating when screen is off | High |
| FR-30 | Driver location shall resume after process kill (Android) | High |
| FR-31 | Driver location shall be broadcast to all riders in the route room | High |
| FR-32 | Rider shall see driver location on a live map | High |
| FR-33 | Map shall update with sub-second latency on significant movement | High |
| FR-34 | ETA from driver to rider pickup shall be displayed | Medium |

### 9.6 History & Places Module

| ID | Requirement | Priority |
|---|---|---|
| FR-35 | Rider shall view last 2 completed/rejected rides on dashboard | Medium |
| FR-36 | "See All" button shall appear when more than 2 past rides exist | Medium |
| FR-37 | Rider shall view full ride history on a dedicated screen | Medium |
| FR-38 | Rider shall save frequently used locations with a custom label | Low |
| FR-39 | Saved places shall display on dashboard for quick access | Low |

---

## 10. Non-Functional Requirements

| ID | Requirement | Metric |
|---|---|---|
| NFR-01 | GPS update latency (foreground) | < 2 seconds |
| NFR-02 | Socket message delivery (server relay) | < 100 ms |
| NFR-03 | App startup time | < 3 seconds on mid-range devices |
| NFR-04 | API response time (search, booking) | < 500 ms |
| NFR-05 | Password storage | bcrypt hash, ≥ 10 rounds |
| NFR-06 | Token security | JWT, signed with secret, not stored in plain text |
| NFR-07 | App supports Android API 24+ (Android 7.0+) | — |
| NFR-08 | App supports iOS 14+ | — |
| NFR-09 | Database connection resilience | Mongoose auto-reconnect |
| NFR-10 | Socket reconnection | Auto-reconnect, max 10 attempts, 2 s delay |
| NFR-11 | Foreground service notification | Always visible while tracking active |
| NFR-12 | Battery impact of GPS tracking | Minimal — distance-threshold gating reduces events by ~70% |

---

## 11. Database Design

### 11.1 Entity Relationship Overview

```
User ─────────────────────── has many ─── Route (as provider)
User ─────────────────────── has many ─── Ride  (as rider)
User ─────────────────────── has one  ─── Vehicle
User ─────────────────────── has many ─── Place

Route ────────────────────── has many ─── Stop
Route ────────────────────── has many ─── Ride
Route ────────────────────── belongs to ─ User (provider)

Ride ─────────────────────── belongs to ─ Route
Ride ─────────────────────── belongs to ─ User (rider)
Ride ─────────────────────── belongs to ─ User (driver)
```

### 11.2 Schema Details

#### users

| Field | Type | Constraints | Description |
|---|---|---|---|
| _id | ObjectId | Auto | MongoDB primary key |
| name | String | Required | Full name |
| email | String | Required, Unique, Indexed | Login email |
| password | String | Required | bcrypt hash |
| phone | String | Optional | Contact number |
| role | String | Enum: user/provider | Determines dashboard shown |
| createdAt | Date | Auto | Registration timestamp |
| updatedAt | Date | Auto | Last update |

#### routes

| Field | Type | Constraints | Description |
|---|---|---|---|
| _id | ObjectId | Auto | Primary key |
| providerId | ObjectId (ref: User) | Required | Driver who owns this route |
| routeName | String | Required | Human-readable route label |
| from.name | String | Required | Origin location name |
| from.coordinates.lat | Number | Required | Origin latitude |
| from.coordinates.lng | Number | Required | Origin longitude |
| to.name | String | Required | Destination name |
| to.coordinates.lat | Number | Required | Destination latitude |
| to.coordinates.lng | Number | Required | Destination longitude |
| stops | [ObjectId] (ref: Stop) | — | Ordered list of stop references |
| isActive | Boolean | Default: true | Route is publicly visible |
| isLeaving | Boolean | Default: false | Driver is currently en route |
| departures | Array | — | Scheduled departures |
| departures[].date | String | YYYY-MM-DD | Departure date |
| departures[].time | String | HH:MM | Departure time (24h) |
| departures[].isLeaving | Boolean | — | Is this departure active now |
| departures[].isCompleted | Boolean | — | Has this departure finished |
| driverLocation.latitude | Number | — | Last known driver latitude |
| driverLocation.longitude | Number | — | Last known driver longitude |
| driverLocation.accuracy | Number | — | GPS accuracy in metres |
| driverLocation.speed | Number | — | Speed in m/s |
| driverLocation.heading | Number | — | Bearing in degrees |
| driverLocation.timestamp | Number | — | Unix timestamp (ms) |
| seatsLeft | Number | Default: 4 | Remaining bookable seats |
| createdAt | Date | Auto | — |

#### rides

| Field | Type | Constraints | Description |
|---|---|---|---|
| _id | ObjectId | Auto | Primary key |
| routeId | ObjectId (ref: Route) | Required | Which route this ride is on |
| userId | ObjectId (ref: User) | Required | The rider |
| driverId | ObjectId (ref: User) | Required | The driver |
| pickupStop | String | Required | Named stop where rider boards |
| dropoffStop | String | Required | Named stop where rider exits |
| rideRequestStatus | String | Enum: Pending/Approved/Rejected | Driver response to booking |
| rideStatus | String | Enum: OnTheWay/InProgress/Completed | Journey progress |
| createdAt | Date | Auto | When request was submitted |

#### vehicles

| Field | Type | Constraints | Description |
|---|---|---|---|
| _id | ObjectId | Auto | — |
| userId | ObjectId (ref: User) | Required, Unique | One vehicle per provider |
| type | String | Required | sedan / suv / hatchback / van |
| model | String | Required | Make and model (e.g., Suzuki Alto) |
| plateNumber | String | Required | Registration number |
| year | String | Optional | Manufacturing year |
| color | String | Optional | Exterior colour |
| capacity | Number | Default: 4 | Total passenger seats |

#### stops

| Field | Type | Constraints | Description |
|---|---|---|---|
| _id | ObjectId | Auto | — |
| routeId | ObjectId (ref: Route) | Required | Parent route |
| stopName | String | Required, Text-indexed | Human-readable stop name |

#### places

| Field | Type | Constraints | Description |
|---|---|---|---|
| _id | ObjectId | Auto | — |
| userId | ObjectId (ref: User) | Required | Owner rider |
| title | String | Required | Label (e.g., "Home", "Office") |
| location.name | String | Required | Address or place name |
| location.coordinates.lat | Number | — | Latitude |
| location.coordinates.lng | Number | — | Longitude |
| streetAddress | String | Optional | Full street address |

---

## 12. Backend API Documentation

**Base URL:** `http://{host}:5000/api`

All protected endpoints require the header:
```
Authorization: Bearer <jwt_token>
```

### 12.1 Authentication

#### POST /auth/signup
Register a new user.

**Request Body:**
```json
{
  "name": "Ali Khan",
  "email": "ali@example.com",
  "phone": "0300-1234567",
  "password": "securepass",
  "role": "user"
}
```

**Response 201:**
```json
{
  "success": true,
  "user": { "_id": "...", "name": "Ali Khan", "role": "user" },
  "token": "eyJhbGc..."
}
```

#### POST /auth/login
Authenticate an existing user.

**Request Body:**
```json
{ "email": "ali@example.com", "password": "securepass" }
```

**Response 200:**
```json
{
  "success": true,
  "user": { "_id": "...", "name": "Ali Khan", "role": "user", "token": "..." }
}
```

---

### 12.2 Vehicle

#### POST /vehicle *(auth required)*
Create or update the authenticated provider's vehicle.

**Request Body:**
```json
{
  "type": "sedan",
  "model": "Suzuki Cultus",
  "plateNumber": "ABC-123",
  "year": "2022",
  "color": "White",
  "capacity": 4
}
```

**Capacity defaults by type:** sedan/hatchback → 4, suv → 6, van → 8.

#### GET /vehicle *(auth required)*
Get current user's registered vehicle.

#### DELETE /vehicle *(auth required)*
Remove the vehicle registration.

---

### 12.3 Routes

#### POST /routes *(auth required — provider)*
Create a new route.

**Request Body:**
```json
{
  "routeName": "Clifton → Gulshan",
  "from": {
    "name": "Clifton Block 5",
    "coordinates": { "lat": 24.8138, "lng": 67.0299 }
  },
  "to": {
    "name": "Gulshan-e-Iqbal",
    "coordinates": { "lat": 24.9215, "lng": 67.0946 }
  },
  "stops": ["Tariq Road", "Bahadurabad", "Nagan Chowrangi"]
}
```

#### GET /routes *(auth required — provider)*
List all routes belonging to the authenticated provider.

#### GET /routes/search *(auth required)*
Find active routes near pickup and drop-off coordinates.

**Query Parameters:**
- `pickup_lat`, `pickup_lng` — rider's boarding location
- `dropoff_lat`, `dropoff_lng` — rider's exit location
- `radius` — match radius in km (default: 5)

**Response:**
```json
{
  "routes": [
    {
      "_id": "...",
      "routeName": "Clifton → Gulshan",
      "seatsLeft": 3,
      "isLeaving": true,
      "pickupDistance": 1.2,
      "dropoffDistance": 0.8,
      "stops": [...]
    }
  ]
}
```

#### GET /routes/:id *(auth required)*
Get a specific route with stops.

#### DELETE /routes/:id *(auth required — provider)*
Delete a route and all its stops.

#### POST /routes/:id/departure *(auth required)*
Add a scheduled departure.

**Request Body:**
```json
{ "date": "2026-05-10", "time": "08:30", "isLeaving": false }
```

#### PATCH /routes/:id/departure/complete *(auth required)*
Mark today's active departure as complete, clear driver location, set isLeaving = false.

#### PATCH /routes/:id/leaving *(auth required)*
Toggle the isLeaving flag.

#### POST /location/update *(auth required)*
Push driver GPS position. Used by both the JS tracking service and the native HTTP fallback (background/kill state).

**Request Body:**
```json
{
  "routeId": "...",
  "latitude": 24.8605,
  "longitude": 67.0104,
  "accuracy": 8.5,
  "speed": 12.3,
  "heading": 45.0,
  "timestamp": 1715270400000
}
```

**Side effect:** emits `driver-location` event to Socket.IO room `route:{routeId}`.

---

### 12.4 Rides

#### POST /rides *(auth required — rider)*
Submit a ride request.

**Request Body:**
```json
{
  "routeId": "...",
  "pickupStop": "Tariq Road",
  "dropoffStop": "Bahadurabad"
}
```

**Validation:**
- Route must exist and have `seatsLeft > 0`
- Rider must not have another active ride

#### GET /rides/user *(auth required — rider)*
Get all rides for the current rider (newest first).

#### GET /rides/active *(auth required — rider)*
Get the current active (non-completed, non-rejected) ride.

#### GET /rides/requests *(auth required — driver)*
Get all pending/approved ride requests for the driver's routes.

#### GET /rides/:id *(auth required)*
Get a specific ride (accessible to both the rider and the driver of that ride).

#### PATCH /rides/:id/request-status *(auth required — driver)*
Approve or reject a ride request.

**Request Body:** `{ "status": "Approved" }` or `{ "status": "Rejected" }`

**On Approved:**
- Decrements `route.seatsLeft` by 1
- Emits `ride:update` to `user:{riderId}` socket room

#### PATCH /rides/:id/ride-status *(auth required — driver)*
Advance the journey status.

**Request Body:** `{ "status": "InProgress" }` or `{ "status": "Completed" }`

**Side effect:** emits `ride:update` to `user:{riderId}` socket room.

---

### 12.5 Places

#### POST /places *(auth required)*
Save a location.

**Request Body:**
```json
{
  "title": "Home",
  "location": { "name": "Block 5, Clifton", "coordinates": { "lat": 24.81, "lng": 67.02 } },
  "streetAddress": "Street 4, Block 5 Clifton, Karachi"
}
```

#### GET /places *(auth required)*
Get all saved places for the current user.

#### DELETE /places/:id *(auth required)*
Delete a saved place.

---

### 12.6 Stops

#### GET /stops/search *(auth required)*
Full-text search for stop names (used in Add Route autocomplete).

**Query:** `?query=tariq`

---

## 13. Frontend Architecture

### 13.1 Screen Map

```
App.js (NavigationContainer)
│
├── Login
├── Signup
│
├── UserDashboard (Home.js)
│   ├── BookRide
│   │   └── [selects route → submits ride request]
│   ├── RideDetails
│   │   └── [live map + status tracking]
│   ├── AllRides
│   ├── SavePlace
│   └── ViewAllPlaces
│
└── ProviderDashboard (proider/Home.js)
    ├── Vehicle (vehicle registration)
    ├── AddRoute
    ├── ProviderRoutes
    │   └── [departure management + GPS tracking]
    └── RequestDetails
```

### 13.2 State Management Architecture

```
┌─────────────────────────────────────────────────┐
│                  Zustand Stores                  │
│                                                  │
│  useAuthStore (persisted to AsyncStorage)        │
│  ─────────────────────────────────────────────   │
│  user: { _id, name, email, role, token }         │
│  isAuthenticated: boolean                        │
│  isLoading: boolean                              │
│  error: string | null                            │
│  login(email, password) → Promise                │
│  signup(userData) → Promise                      │
│  logout() → void                                 │
│                                                  │
│  useSession (in-memory only)                     │
│  ─────────────────────────────────────────────   │
│  currentLocation: [lng, lat]                     │
│  activeTrackingRouteId: string | null            │
│  setActiveTrackingRouteId(id) → void             │
└─────────────────────────────────────────────────┘
```

### 13.3 Service Layer

```
src/services/
│
├── locationService.js
│   Bridges native LocationModule to JS.
│   startLocationSharing() — requests permissions, starts native GPS, attaches listeners
│   stopLocationSharing()  — stops native GPS, detaches listeners
│   setLocationCallback(fn) — set the function called on every GPS update
│   saveTrackingInfo(routeId, token, serverUrl) — writes to native SharedPreferences/UserDefaults
│   clearTrackingInfo() — clears native storage
│
├── trackingService.js
│   Module-level singleton that drives driver tracking.
│   startTracking(routeId) — connects socket, joins route room, wires up location callback
│   stopTracking(routeId)  — leaves room, clears callback
│   Emission logic: emits socket event only if driver moved ≥15m OR ≥4s elapsed
│
└── socketService.js
    Singleton Socket.IO client.
    connectSocket() → Promise<Socket>
    getSocket() → Socket | null
    Transports: websocket only
    Auto-reconnect: 10 attempts, 2s delay
```

### 13.4 Component Architecture

```
src/components/
│
├── LiveRideMap.js
│   React.memo'd Mapbox MapView with:
│   - Declarative <Camera animationMode="flyTo"> (no imperative cameraRef)
│   - React.memo'd PulseMarker (driver position — animated pulsing circle)
│   - React.memo'd RiderMarker (rider position)
│   - Follows driver position automatically
│
└── MapPickerModal.js
    Mapbox map modal for tapping a location to select GPS coordinates.
    Used in Add Route (from/to selection) and BookRide.
```

---

## 14. Real-Time Features & Socket Architecture

### 14.1 Socket Room Model

```
Server manages two room types:

  route:{routeId}
  ───────────────
  Members: the driver + all riders approved/pending on this route
  Events:  driver-location  (driver → server → all riders)
           ride:update      (server → specific riders, on status change)

  user:{userId}
  ─────────────
  Members: the specific user (auto-joined on connect)
  Events:  ride:update  (server → specific rider on ride status change)
```

### 14.2 Event Catalogue

| Event | Direction | Payload | Description |
|---|---|---|---|
| `join-route` | Client → Server | `{ routeId }` | Join the route broadcast room |
| `leave-route` | Client → Server | `{ routeId }` | Leave the route room |
| `driver-location` | Driver → Server | `{ routeId, latitude, longitude, accuracy, speed, heading, timestamp }` | Driver pushes GPS position |
| `driver-location` | Server → Riders | `{ latitude, longitude, accuracy, speed, heading, timestamp }` | Server relays to riders in room |
| `ride:update` | Server → Rider | `{ ride: <populated ride object> }` | Ride status changed |

### 14.3 Location Update Strategy

```
GPS fires on Android every 1–2 seconds
         │
         ▼
trackingService.js receives location
         │
         ├─ Compute distance from last emitted position (Haversine)
         │
         ├─ If moved ≥ 15m ──────────────────► EMIT via socket immediately
         │                                       (real movement detected)
         │
         └─ If < 15m but ≥ 4s since last emit ► EMIT heartbeat via socket
                                                  (confirms driver is alive)
                                                  
         Either way: REST sync every 30s to persist to DB
                     (late-joining riders see last-known position)
```

### 14.4 HTTP Fallback (Background/Kill State)

```
App is backgrounded or process is killed
         │
         ▼
Android LocationService.kt (Foreground Service, START_STICKY)
         │
         ├─ Continues receiving GPS from FusedLocationProviderClient
         │
         ├─ broadcastLocation() ──► BroadcastReceiver ──► JS (if alive)
         │
         └─ postLocationToBackend() (every 5s)
              │
              ├─ Reads: routeId, token, serverUrl from SharedPreferences
              │   (written by saveTrackingInfo() before tracking started)
              │
              └─ POST /api/location/update  (HttpURLConnection, background thread)
                   │
                   └─ Server updates DB + emits to socket room
                        │
                        └─ Riders receive driver-location via WebSocket ✓
```

---

## 15. Native Location Tracking Module

### 15.1 Android Implementation

**`LocationService.kt`** — Android Foreground Service

- Extends `android.app.Service`
- Declares `FOREGROUND_SERVICE_TYPE_LOCATION` on Android Q+
- Maintains a persistent `Notification` in the status bar (required by Android for foreground services)
- Uses `FusedLocationProviderClient` for GPS (Google's battery-efficient location API)
- GPS intervals: 2s preferred, 1s minimum, 3s max delay
- On each location update:
  1. `broadcastLocation()` — sends local broadcast picked up by `LocationModule.kt`
  2. `postLocationToBackend()` — direct HTTP POST every 5s (bypasses JS thread)
- `START_STICKY` restart policy — OS automatically restarts the service after kills

**`LocationModule.kt`** — React Native Bridge

- Extends `ReactContextBaseJavaModule`
- Exposes to JS: `startTracking()`, `stopTracking()`, `getCurrentLocation()`, `saveTrackingInfo()`, `clearTrackingInfo()`
- Registers a `BroadcastReceiver` that listens for `com.coridehub.LOCATION_UPDATE` broadcasts
- Converts broadcast extras to a `WritableMap` and emits `onLocationUpdate` React event

### 15.2 iOS Implementation

**`LocationModule.swift`** — Swift CLLocationManager

- Extends `RCTEventEmitter`
- `allowsBackgroundLocationUpdates = true` — keeps GPS alive when app is backgrounded
- `pausesLocationUpdatesAutomatically = false` — prevents iOS from pausing on detected stillness
- `showsBackgroundLocationIndicator = true` — blue status bar indicator (required UX for background location)
- `distanceFilter = kCLDistanceFilterNone` — fires on every GPS tick (JS layer filters)
- On each location update:
  1. Resolves pending `getCurrentLocation` promise if one is waiting
  2. Emits `onLocationUpdate` via `RCTEventEmitter` (reaches JS when app is active)
  3. Posts to backend via `URLSession.shared.dataTask` every 5s (background fallback)
- Credentials read from `UserDefaults` (written by `saveTrackingInfo()`)

**`LocationModule.m`** — Bridge Declaration

- `RCT_EXTERN_MODULE` registers the Swift class with the React Native bridge
- `RCT_EXTERN_METHOD` declarations expose each Swift `@objc func` to JavaScript

### 15.3 Permission Requirements

**Android `AndroidManifest.xml`:**
```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />
```

**iOS `Info.plist`:**
```xml
<key>NSLocationWhenInUseUsageDescription</key>
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<key>UIBackgroundModes</key>
<array><string>location</string></array>
```

---

## 16. Security Implementation

### 16.1 Authentication Security

| Measure | Implementation |
|---|---|
| Password hashing | bcrypt with 10+ salt rounds — passwords are never stored in plain text |
| Token format | JSON Web Token (JWT) — stateless, signed with `JWT_SECRET` env variable |
| Token storage | AsyncStorage (device-local) — not stored in JS state only |
| Token injection | Axios request interceptor adds `Authorization: Bearer` header automatically |
| Token expiry | Configurable via JWT `expiresIn` option |
| 401 handling | Response interceptor clears token and auth state on Unauthorized response |

### 16.2 API Security

| Measure | Implementation |
|---|---|
| Route protection | `authMiddleware` validates JWT on every protected endpoint |
| Ownership checks | Controllers verify `providerId === req.user.id` before mutations |
| Rider isolation | Ride queries filter by `userId` or `driverId` — no cross-user data leaks |
| Socket auth | JWT verified in Socket.IO middleware before any connection is accepted |
| Input validation | Required fields checked on every endpoint; invalid enum values rejected |
| CORS | `cors()` middleware applied; configured for origin `*` in dev (restrict in prod) |

### 16.3 Native Security

| Measure | Implementation |
|---|---|
| SharedPreferences scope | `MODE_PRIVATE` — data accessible only to this app |
| UserDefaults scope | Standard app bundle namespace — not accessible by other apps |
| Foreground service | Token stored natively for HTTP fallback — never logged or exposed |

---

## 17. User Manual — Rider (User)

### 17.1 Getting Started

#### Step 1 — Download and Open
Install the CoRideHub app from the distribution channel. On first launch you will see the Login screen.

#### Step 2 — Create an Account
1. Tap **Sign Up** on the Login screen.
2. Select your role: tap the **Rider** card.
3. Enter your full name, email address, phone number, and a secure password.
4. Tap **Create Account**.
5. You will be taken directly to your Rider Dashboard.

#### Step 3 — Allow Location Permission
When prompted, allow CoRideHub to access your location **while using the app**. This is required to find routes near you. Without this permission the route search will not function.

---

### 17.2 Rider Dashboard

The dashboard shows:

- **Your name** and a greeting in the header.
- **Active ride card** (if you have a pending or approved ride) — shows the status and the route. Tap it to open Ride Details.
- **Book a Ride** — opens the route search.
- **Recent Rides** — your last 2 completed or rejected rides. Tap any card to view details. If you have more than 2 past rides, a **See All** button appears next to the heading.
- **Saved Places** — your bookmarked locations.

---

### 17.3 Booking a Ride

1. Tap **Book a Ride** from the dashboard.
2. The app detects your current location automatically.
3. **Pickup location:** tap the pickup field and either use your current location (tap the blue dot button) or tap the map to select a point.
4. **Drop-off location:** tap the drop-off field and select your destination on the map.
5. Tap **Search Routes**.
6. A list of matching active routes appears, showing:
   - Route name and driver
   - Distance from your pickup to the route start
   - Distance from the route end to your drop-off
   - Seats available
   - Whether the driver is currently leaving
7. Tap a route card to expand its details.
8. Select your **Pickup Stop** from the route's stop list.
9. Select your **Drop-off Stop** from the stop list.
10. Tap **Join Ride**.

> **Note:** If you already have an active ride, you will see an error and cannot book another until your current ride is completed or rejected.

> **Note:** If a route shows **0 seats left**, the Join Ride button will be disabled.

---

### 17.4 Tracking Your Ride

Once you have submitted a ride request:

1. You will see the ride with **Pending** status.
2. When the driver approves your request, the status changes to **Accepted** automatically — you do not need to refresh. The update is pushed in real-time via socket.
3. Once the driver starts their journey and the route becomes active, the screen switches to **Live Map mode**:
   - A pulsing marker shows the driver's current position.
   - The map follows the driver automatically.
   - An ETA chip shows the estimated time for the driver to reach your pickup stop.
4. When the driver picks you up and starts the trip, the status updates to **In Progress**.
5. When the journey ends, the status updates to **Completed**.

**To manually refresh:** tap the refresh icon in the top-right corner.

**To go back to the dashboard:** tap the back arrow. The socket subscription is maintained even when you navigate away — you will see the updated status when you return.

---

### 17.5 Ride History

1. From the dashboard, scroll to **Recent Rides**.
2. Tap any ride card to view full details.
3. If you have more than 2 past rides, tap **See All** to open the complete ride history screen.
4. The history screen shows all rides with a colour-coded status badge.

---

### 17.6 Saved Places

1. On the dashboard, scroll to **Saved Places** and tap the **+** button.
2. On the Save Place screen, enter a label (e.g., "Home", "University").
3. Tap the map or search for a location.
4. Tap **Save**.
5. Saved places appear on your dashboard. Tap a saved place during route search to quickly set it as your pickup or drop-off.

---

## 18. User Manual — Driver (Provider)

### 18.1 Getting Started

#### Step 1 — Sign Up as a Provider
1. On the Signup screen, select the **Driver** card.
2. Fill in your details and tap **Create Account**.
3. You will be taken to the **Vehicle Registration** screen automatically.

#### Step 2 — Register Your Vehicle
1. Select your **Vehicle Type** (Sedan, SUV, Hatchback, Van).
2. Enter the **Make & Model** (e.g., Suzuki Cultus).
3. Enter your **Plate Number**.
4. Optionally add Year and Color.
5. Tap **Save Vehicle**.
6. You will proceed to the Provider Dashboard.

> **Why this matters:** your vehicle capacity determines how many seats will be available when you create routes.

---

### 18.2 Provider Dashboard

The dashboard shows:

- **Quick stats** (Earnings, Rides count — visual summary)
- **Incoming ride requests** from riders on your routes
- Each request card shows the rider's name, route, pickup stop, and drop-off stop
- Tap any request card to view full details and approve/reject

---

### 18.3 Creating a Route

1. Tap **My Routes** from the bottom navigation or provider menu.
2. Tap the **+** button (Add Route).
3. Enter a **Route Name** (3–50 characters, e.g., "Clifton → Gulshan Daily").
4. Tap **From** — the map picker opens. Tap your starting point or search for it.
5. Tap **To** — select your destination.
6. In the **Stops** section, type a stop name in the search box. Suggestions appear; tap one to add it. Repeat for all intermediate stops.
7. Tap **Create Route**.

The route now appears on your My Routes screen.

---

### 18.4 Announcing a Departure

When you are ready to leave for the day:

1. On **My Routes**, find the route you are driving.
2. Tap the **Start Leaving** button (car-arrow icon).
3. A scheduling modal appears:
   - Select the **date** (today is pre-selected).
   - Scroll the hour and minute pickers to your departure time.
4. Tap **Start Leaving** in the modal.
5. The route card now shows the **Leaving** badge. Your GPS tracking begins automatically.

> **Important:** the app will request location permission before starting. If tracking was denied previously, go to phone Settings → Apps → CoRideHub → Permissions → Location → Allow Always.

> **Background tracking:** once started, you can minimise the app, lock the screen, or even receive a call. The location service continues running in the background. Riders will always see your live position on their maps.

---

### 18.5 Managing Ride Requests

While your route is active, riders can send booking requests. You will see them on the **Provider Dashboard** and also on the **My Routes** screen as a count badge.

**To approve a request:**
1. Tap the request card.
2. Tap **Approve**.
3. The rider's app instantly updates to show "Accepted" status.
4. One seat is deducted from the route's available count.

**To reject a request:**
1. Tap the request card.
2. Tap **Reject**.
3. The rider is notified in real-time. No seat deduction occurs.

---

### 18.6 Completing a Departure

When you arrive at the destination:

1. On **My Routes**, tap the **Complete** button on the active route card.
2. The route's status resets: `isLeaving` → false, driver location → cleared, GPS tracking stops.
3. Seats are not automatically restored on completion (contact admin for seat reset, or use a future re-departure).

---

### 18.7 Understanding the Tracking Notification

While tracking is active, you will always see a persistent notification in the Android status bar:

```
CoRideHub
Tracking your location
```

This notification **cannot be dismissed** while tracking is active — it is required by Android for background services. It disappears automatically when you complete the departure or stop the app.

On iOS, a **blue location indicator** appears in the status bar during tracking.

---

## 19. System Data Flow Diagrams

### 19.1 Ride Booking Flow

```
RIDER                    SERVER                   DRIVER
  │                         │                       │
  │  GET /routes/search     │                       │
  │────────────────────────►│                       │
  │                         │ Haversine filter      │
  │◄────────────────────────│ matched routes        │
  │                         │                       │
  │  POST /rides            │                       │
  │ { routeId, pickupStop, │                       │
  │   dropoffStop }         │                       │
  │────────────────────────►│                       │
  │                         │ Create ride (Pending) │
  │◄────────────────────────│                       │
  │  ride created           │                       │
  │                         │                       │
  │                         │  GET /rides/requests  │
  │                         │◄──────────────────────│
  │                         │──────────────────────►│
  │                         │  [request visible]    │
  │                         │                       │
  │                         │  PATCH /rides/:id     │
  │                         │  { status: Approved } │
  │                         │◄──────────────────────│
  │                         │ seatsLeft--           │
  │                         │ emit ride:update      │
  │◄────────────────────────│ to user:{riderId}     │
  │  status: Accepted       │                       │
  │  (socket event)         │                       │
```

### 19.2 Live Tracking Flow

```
DRIVER (Native Service)     SERVER              RIDER (RideDetails.js)
         │                     │                        │
  GPS fires (1–2s)             │                        │
         │                     │                        │
  haversineM() ≥ 15m?          │                        │
  OR ≥ 4s elapsed?             │                        │
         │                     │                        │
  YES    │                     │                        │
         │  socket.emit        │                        │
         │  driver-location    │                        │
         │────────────────────►│                        │
         │                     │  socket.to(            │
         │                     │   route:{id})          │
         │                     │   .emit(               │
         │                     │   driver-location)     │
         │                     │───────────────────────►│
         │                     │                        │ setLiveDriverLocation(loc)
         │                     │                        │ → LiveRideMap re-renders
         │                     │                        │ → Camera.flyTo(new position)
         │                     │                        │
  Every 30s: REST sync         │                        │
         │  POST /location/    │                        │
         │  update             │                        │
         │────────────────────►│                        │
         │                     │ route.driverLocation   │
         │                     │ = { lat, lng, ... }    │
         │                     │ (late-joining riders   │
         │                     │  see last known pos)   │
```

---

## 20. Limitations

### 20.1 Current Limitations

| Area | Limitation | Impact |
|---|---|---|
| iOS Kill State | iOS does not offer a `START_STICKY` equivalent — if the app process is fully killed by the user (not OS), tracking stops | Low — iOS tracks reliably in background without killing |
| Payment | No fare collection or payment processing is integrated | Medium — fare must be handled offline |
| Notifications | No push notifications (FCM/APNs) — ride status updates only reach the user when the app is open | Medium — rider may miss approval if not on the app |
| Seat Reset | Seats are decremented on approval but not automatically restored on ride completion or rejection | Medium — provider must manage seats manually currently |
| Rating System | No driver or rider rating mechanism | Low in v1 |
| Surge / Dynamic Pricing | Not applicable — CoRideHub does not handle pricing | By design |
| Admin Panel | No web-based admin dashboard for content moderation | Medium — requires direct DB access |
| Offline Support | No local data caching — requires active internet connection | Low — ride apps are inherently online |
| Chat | No in-app messaging between driver and rider | Low — phone calls serve this purpose |

### 20.2 Known Technical Constraints

- The Mapbox free tier has a monthly tile request limit; exceeding it in production requires a paid plan.
- `navigator.geolocation` (the legacy JS API, used only for coarse initial location in App.js) does not work in background — this is expected and is not used for driver tracking.
- Socket.IO falls back to HTTP long-polling if WebSocket is blocked; the app explicitly configures `transports: ['websocket']` to prevent this fallback and ensure low latency.

---

## 21. Future Work & Recommendations

### 21.1 Short-Term (Next 3 Months)

1. **Push Notifications (FCM / APNs)**
   Notify riders immediately when their request is approved or rejected, even if the app is closed. Use Firebase Cloud Messaging on Android and APNs on iOS.

2. **Seat Restoration on Rejection/Completion**
   Automatically increment `seatsLeft` when a ride request is rejected or a completed ride is marked done.

3. **Rating System**
   Allow riders to rate drivers (1–5 stars) after a completed ride. Display average rating on route cards.

4. **Driver Chat**
   In-app text messaging between driver and approved rider for coordination.

### 21.2 Medium-Term (3–6 Months)

5. **Digital Fare Collection**
   Integrate a mobile payment gateway (JazzCash, EasyPaisa, Stripe) for optional cashless fare payment.

6. **Admin Dashboard**
   Web-based admin panel for user management, route moderation, dispute resolution, and analytics.

7. **Recurring Departure Automation**
   Allow drivers to set a daily recurring departure schedule so they do not need to manually announce each day.

8. **Stop ETA Calculation**
   Show ETA for each stop on the route so riders waiting at downstream stops know exactly when to start walking.

### 21.3 Long-Term (6–12 Months)

9. **Multi-language Support**
   Urdu, Arabic, and other regional language support for broader adoption.

10. **Corporate Partnership Module**
    B2B module allowing companies to manage employee carpools, set approved routes, and view analytics.

11. **AI Route Suggestions**
    Machine learning to suggest optimal routes based on historical ride request patterns.

12. **Insurance Integration**
    Partner with insurers to offer per-trip micro-insurance for both drivers and riders.

---

## 22. Conclusion

CoRideHub successfully addresses a real and widespread problem in urban commuting: the absence of a structured digital layer over the informal carpooling economy. The application delivers a complete end-to-end solution covering user onboarding, vehicle registration, route management, proximity-based discovery, ride booking, real-time GPS tracking, and ride history.

The most technically significant achievement is the **native background GPS architecture**. By implementing a Kotlin `LocationService` on Android (running as a foreground service with `START_STICKY` restart behaviour) and a Swift `CLLocationManager` on iOS (with `allowsBackgroundLocationUpdates = true`), CoRideHub solves the fundamental limitation of JavaScript-based location tracking — that it ceases functioning the moment the application is backgrounded. The addition of a direct HTTP fallback from the native layer, using credentials persisted in `SharedPreferences` / `UserDefaults`, ensures that driver location continues to reach the server even in kill-state scenarios.

The **Socket.IO room-based architecture** provides scalable, low-latency real-time communication. By organising clients into named rooms (`route:{id}` and `user:{id}`), the server avoids broadcasting location data to unrelated connections and delivers updates only to the relevant riders. The **distance-threshold emission strategy** (emit only on ≥ 15 m movement or ≥ 4 s elapsed) eliminates GPS jitter noise and reduces unnecessary network traffic while preserving near-instant responsiveness to actual vehicle movement.

The application demonstrates that a single React Native codebase, augmented with carefully written native modules in Kotlin and Swift, can match the reliability of fully native applications in scenarios — like background GPS — that have historically required platform-specific implementations.

CoRideHub represents a solid, production-capable foundation. With the addition of push notifications, payment processing, and an admin panel, it is ready for real-world deployment and commercial operation.

---

## 23. Summary A–Z

**A — Authentication**
JWT-based stateless authentication. Passwords hashed with bcrypt. Token persisted in AsyncStorage. Axios interceptor injects token on every API request. 401 responses clear auth state automatically.

**B — Background Tracking**
Android: native Foreground Service (START_STICKY) continues GPS regardless of app state. iOS: CLLocationManager with `allowsBackgroundLocationUpdates = true`. Both platforms use native HTTP fallback to post to backend when JS thread is suspended.

**C — Capacity Management**
Vehicle capacity set during registration (Sedan=4, SUV=6, Hatchback=4, Van=8). Each route's `seatsLeft` field tracks available seats. Booking blocked when seatsLeft = 0. Seat decremented on ride approval.

**D — Database**
MongoDB with Mongoose ODM. Six collections: users, routes, stops, rides, places, vehicles. Indexed on email (unique), stop name (text search), route provider.

**E — Emission Strategy**
Socket emissions from driver are distance-gated: emit only if driver moved ≥ 15 metres since last emission OR ≥ 4 seconds elapsed (heartbeat). Eliminates GPS jitter; preserves real-time responsiveness.

**F — Foreground Service**
Android `LocationService.kt` runs as a mandatory foreground service with a persistent notification. Required by Android API 26+ for background location access. Restarts automatically via `START_STICKY` if killed by OS.

**G — GPS**
FusedLocationProviderClient on Android (preferred interval: 2s, minimum: 1s). CLLocationManager on iOS (distanceFilter: none, desiredAccuracy: best). Both platforms fire updates directly to native module.

**H — Haversine Formula**
Used in two places: (1) backend route search — filters routes within configurable km radius of pickup and drop-off coordinates; (2) trackingService.js — computes metres moved since last socket emission.

**I — isLeaving Flag**
Boolean field on the Route model. Set to true when a driver announces a departure. Triggers live-map mode on rider's RideDetails screen. Cleared when departure is completed.

**J — JWT (JSON Web Token)**
Signed with `JWT_SECRET` environment variable. Decoded by `authMiddleware` on every protected API endpoint and by Socket.IO middleware on every WebSocket connection.

**K — Kill State**
Android: `START_STICKY` restarts `LocationService` after process kill. On restart, reads `routeId`, `token`, `serverUrl` from `SharedPreferences` (persisted by `saveTrackingInfo()` before tracking began) and resumes HTTP posts.

**L — Live Map**
`LiveRideMap.js` renders a Mapbox `MapView` with a pulsing driver marker and optional rider marker. Camera follows driver using declarative `animationMode="flyTo"`. Wrapped in `React.memo` to prevent unnecessary re-renders.

**M — MongoDB**
Document-oriented NoSQL database. Chosen for flexible schema evolution (driverLocation subdocument, departures array). Mongoose provides schema validation, population (joins), and auto-timestamps.

**N — Native Modules**
Custom bridge between React Native (JavaScript) and platform APIs (Kotlin/Swift). `LocationModule` on both platforms exposes `startTracking`, `stopTracking`, `getCurrentLocation`, `saveTrackingInfo`, `clearTrackingInfo` to JavaScript.

**O — Objectives**
The system achieves all 9 primary objectives defined in Section 5: authentication, route management, ride discovery, booking, approval workflow, live tracking, ride history, saved places, and vehicle registration.

**P — Provider (Driver)**
One of two user roles. Registers a vehicle, creates routes with stops, announces departures, manages ride requests, and drives the route while being tracked live.

**Q — Queue (Socket Rooms)**
Socket.IO rooms act as a message queue namespace. `route:{id}` room delivers driver-location events. `user:{id}` room delivers ride status update events. Clients auto-join their personal room on socket connection.

**R — Ride Lifecycle**
`Pending` → driver approves → `Approved` → driver starts → `InProgress` → driver completes → `Completed`. Rejected requests go: `Pending` → `Rejected`. Status pushed to rider via socket at each transition.

**S — Socket.IO**
WebSocket server on Node.js using Socket.IO 4.x. Transports restricted to `websocket` (no long-polling fallback). Auto-reconnection with 10 attempts and 2-second delay. JWT-authenticated middleware on all connections.

**T — Technology Stack**
React Native 0.85.2, React Navigation, Zustand, Axios, Socket.IO client, Mapbox, Formik+Yup (frontend). Node.js, Express 4.18, MongoDB, Mongoose, Socket.IO server, JWT, bcrypt (backend). Kotlin + Swift (native).

**U — User (Rider)**
One of two user roles. Searches routes by proximity, books seats, tracks driver live, views ride history, saves frequent locations.

**V — Vehicle Model**
Provider registers one vehicle. Fields: type, model, plateNumber, year, color, capacity. Capacity feeds the seatsLeft initialiser on routes. Capacity auto-calculated by type if not explicitly set.

**W — WebSocket**
Bidirectional, low-latency protocol used for driver-location fan-out and ride-status push. Socket.IO wraps raw WebSocket with reconnection, namespacing, room management, and event multiplexing.

**X — Cross-Platform**
Single JavaScript codebase serves both Android and iOS. Platform differences handled by: (1) React Native's platform abstractions; (2) separate native modules per platform; (3) `Platform.OS` conditionals for dev server address.

**Y — Yup Validation**
Used with Formik on all multi-field forms. Schema-based validation rules (required, min/max length, email format, password match) provide user-facing error messages before API calls are made.

**Z — Zustand**
Lightweight state management library used for `useAuthStore` (persisted to AsyncStorage via `zustand/middleware/persist`) and `useSession` (in-memory). Replaces Redux with a fraction of the boilerplate.

---

## 24. Glossary

| Term | Definition |
|---|---|
| API | Application Programming Interface — a contract for how software systems communicate |
| Bearer Token | An HTTP authentication scheme where the token is passed in the `Authorization` header |
| bcrypt | A password hashing function designed to be slow (computationally expensive) to resist brute-force attacks |
| BroadcastReceiver | An Android component that responds to system-wide or app-local broadcast messages |
| CLLocationManager | Apple's framework class for accessing device location services on iOS and macOS |
| FusedLocationProviderClient | Google Play Services API that intelligently combines GPS, Wi-Fi, and cell data for battery-efficient location |
| Foreground Service | An Android service that runs in the foreground, shown to the user via a persistent notification |
| Haversine Formula | A mathematical formula to calculate the great-circle distance between two GPS coordinates on Earth's surface |
| JWT | JSON Web Token — a compact, self-contained token for transmitting claims between parties |
| Mapbox | A mapping and location data platform providing map tiles and navigation SDKs |
| Mongoose | An Object Document Mapper (ODM) for MongoDB in Node.js |
| ODM | Object Document Mapper — provides a schema layer over a NoSQL document database |
| React Native | A framework for building native mobile apps using React and JavaScript |
| SharedPreferences | Android's lightweight key-value storage mechanism for primitive data types |
| Socket.IO | A library for real-time, bidirectional, event-based communication over WebSockets |
| START_STICKY | An Android service return value that instructs the OS to restart the service after it is killed |
| UserDefaults | iOS and macOS's lightweight key-value storage system (analogous to Android SharedPreferences) |
| WebSocket | A protocol providing full-duplex communication channels over a single TCP connection |
| Zustand | A small, fast state management library for React based on hooks |

---

*Document generated: May 2026 | CoRideHub v1.0.0 | Developer: Talha Raj*
