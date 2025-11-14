---
title: Enterprise Java Assignment Solution
layout: post
visibility: public
date: '2025-07-14 17:39:39'
category: Resource
excerpt: This post provides with the solution for the questions given in the enterprise
  programming in java (EPJ) Assignment - 1
author: Jinansh - Materio
image: "/assets/img/covers/17.46.22_664acc74.webp"
summarize: true
semester: "5"
subject: "Enterprise Programming"
next_post: /resource/epj-assignment-2/
---

## 1. What is JDBC?

**JDBC (Java Database Connectivity)** is an API that enables Java applications to interact with databases. Its primary purpose in enterprise applications is to provide a standard interface for connecting to relational databases, executing SQL queries, and retrieving results. JDBC acts as a bridge between Java code and various databases, ensuring portability and flexibility.

**How JDBC Facilitates Interaction:**

- Java applications use JDBC classes and interfaces to establish a connection with a database.
- Developers can execute SQL commands (SELECT, INSERT, UPDATE, DELETE) using JDBC.
- Results are retrieved and processed in Java, enabling dynamic data-driven applications.

**Example:**

```JAVA
Connection conn = DriverManager.getConnection("jdbc:mysql://localhost:3306/mydb", "user", "password");
Statement stmt = conn.createStatement();
ResultSet rs = stmt.executeQuery("SELECT * FROM employees");
while(rs.next()) {
    System.out.println(rs.getString("name"));
}
```

This code connects to a MySQL database, executes a query, and prints employee names.

## 2. Describe the JDBC Architecture

JDBC architecture defines how Java applications communicate with databases. There are two main architectures:

### Two-Tier Architecture

- The Java application communicates directly with the database using JDBC.
- Suitable for simple, small-scale applications.

**Diagram:**

```TEXT
Java Application <--> JDBC Driver <--> Database
```


### Three-Tier Architecture

- Introduces a middle tier (application server) between the client and the database.
- Suitable for large-scale, distributed enterprise applications.

**Diagram:**

```TEXT
Java Application <--> Application Server <--> JDBC Driver <--> Database
```

**Differences \& Use Cases:**

- **Two-Tier:** Direct, simple, less scalable; best for desktop or small apps.
- **Three-Tier:** More scalable, secure, supports business logic in the middle tier; used in web and enterprise systems.


## 3. Main Components of JDBC

The four major components are:

1. **JDBC Drivers:** Enable Java applications to communicate with different databases.
2. **DriverManager:** Manages a list of database drivers and establishes connections.
3. **Connection:** Represents a session with a specific database.
4. **Statement:** Used to execute SQL queries against the database.

**Role of DriverManager:**
Acts as a factory for database connections, selecting the appropriate driver for the requested database.

**Role of Test Suite:**
A set of tools and tests to verify JDBC driver compliance and correctness.

## 4. JDBC Classes and Interfaces

Five important JDBC classes/interfaces:


| Class/Interface | Description |
| :-- | :-- |
| `DriverManager` | Manages database drivers and connections. |
| `Connection` | Represents a connection/session with a database. |
| `Statement` | Executes static SQL statements and returns results. |
| `PreparedStatement` | Executes precompiled SQL statements with parameters for efficiency. |
| `ResultSet` | Represents the result set of a query; allows iteration over query results. |

## 5. Key Features of JDBC

- **Database Independence:** Works with any database supporting a JDBC driver, making applications portable.
- **SQL Support:** Allows execution of SQL statements from Java, enabling dynamic data operations.
- **Exception Handling:** Robust error handling using exceptions, improving reliability and debugging.


## 6. Comparison of JDBC Driver Types

| Type | Description | Advantages | Disadvantages |
| :-- | :-- | :-- | :-- |
| Type-1 | JDBC-ODBC Bridge Driver | Easy to use, universal | Slow, requires ODBC installation |
| Type-2 | Native-API Driver | Faster than Type-1 | Platform dependent, needs native libs |
| Type-3 | Network Protocol Driver | Flexible, no client-side DB code | Needs middleware server |
| Type-4 | Thin Driver (Pure Java) | Platform independent, fast | DB specific, needs separate driver |

## 7. When to Use Each JDBC Driver Type

- **Type-1:** For quick prototyping or legacy systems where ODBC is already in use.
- **Type-2:** When performance is critical and native libraries are available for the target platform.
- **Type-3:** In enterprise environments with a middleware server managing database access.
- **Type-4:** Preferred for most modern applications due to its speed, portability, and ease of deployment.

These solutions provide a comprehensive overview of JDBC concepts, architecture, components, features, and driver types relevant for enterprise Java applications.

<div style="text-align: center">⁂</div>


<div class="newtopic"></div>

# Assignment 2

## 1) What is a Servlet?

A Servlet is a Java class that runs on a Java-enabled web server and handles HTTP requests and responses, enabling dynamic web content. It acts as a middle layer between a client (browser) and server-side resources (databases, services). Servlets are managed by a servlet container (e.g., Tomcat, Jetty) which loads, initializes, invokes, and destroys them.

Basics of a web application:

- A web app is packaged as a WAR containing HTML/JSP, static assets, classes, and configuration (web.xml or annotations).
- The client sends an HTTP request to a URL mapped to a servlet.
- The servlet container routes the request to the mapped servlet, provides HttpServletRequest/HttpServletResponse objects, and the servlet writes the response (HTML/JSON, etc.).
- Typical flow: Browser → HTTP request → Servlet Container → Servlet → Business logic/DB → Response → Browser.

How servlets function:

- Extend HttpServlet, override doGet/doPost (or service) to process HTTP methods.
- Use request parameters, headers, attributes; write output via response writer or stream.
- Use ServletContext for app-wide resources, and ServletConfig for per-servlet init parameters.
- Support session management via HttpSession.


## 2) Servlet Lifecycle

The servlet lifecycle is managed by the container:

1) Loading and Instantiation:

- The container loads the servlet class and creates an instance (typically on first request, or at startup if load-on-startup is configured).

2) Initialization:

- The container calls init(ServletConfig config) exactly once to initialize resources.

3) Request Handling:

- For each request, the container calls service(HttpServletRequest req, HttpServletResponse resp), which dispatches to doGet, doPost, doPut, doDelete, etc., depending on the HTTP method.

4) Destruction:

- When the application is stopping or the servlet is being taken out of service, the container calls destroy() once so the servlet can release resources.

Flow:
load class → instantiate → init() → [service() → doXXX() for each request] → destroy()

## 3) init(), service(), and destroy() Methods (with examples)

- init(ServletConfig config)
    - Called once after instantiation.
    - Use it to read init parameters, initialize DB connections, caches, thread pools, etc.
    - Do not perform long blocking tasks that delay readiness without need.
- service(HttpServletRequest req, HttpServletResponse resp)
    - Called for each request.
    - Default implementation in HttpServlet dispatches to doGet/doPost/… based on request method.
    - Override doGet/doPost in most cases; override service only when custom dispatching is needed.
- destroy()
    - Called once before the servlet is unloaded.
    - Close DB connections, stop background threads, flush logs, release resources.

Example:

```java
import jakarta.servlet.ServletConfig;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.io.PrintWriter;

public class SampleServlet extends HttpServlet {

    private String greeting;

    @Override
    public void init(ServletConfig config) throws ServletException {
        super.init(config);
        // Read init-param from web.xml or annotation initParams
        greeting = config.getInitParameter("greeting");
        if (greeting == null) {
            greeting = "Hello";
        }
        // Initialize resources (e.g., DataSource lookup)
    }

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        resp.setContentType("text/plain;charset=UTF-8");
        try (PrintWriter out = resp.getWriter()) {
            String name = req.getParameter("name");
            if (name == null || name.isBlank()) name = "World";
            out.println(greeting + ", " + name + "!");
        }
    }

    // Optionally handle POST
    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        doGet(req, resp);
    }

    @Override
    public void destroy() {
        // Clean up resources (close pools, stop schedulers, etc.)
    }
}
```

If overriding service:

```java
@Override
protected void service(HttpServletRequest req, HttpServletResponse resp) throws IOException {
    // Example: log method, then delegate
    String method = req.getMethod();
    // Custom logic...
    super.service(req, resp); // keep default dispatch to doGet/doPost...
}
```

Key points:

- init: once per servlet instance.
- service: per request; dispatches to doXXX.
- destroy: once before removal.


## 4) What is the Servlet API?

The Servlet API defines interfaces and classes used by servlets and containers to communicate.

Packages:

- javax.servlet (or jakarta.servlet in newer versions)
    - Core interfaces: Servlet, ServletRequest, ServletResponse, Filter, FilterChain, RequestDispatcher, ServletConfig, ServletContext, ServletException, AsyncContext, ServletRegistration.
    - Listener interfaces: ServletContextListener, ServletContextAttributeListener, ServletRequestListener, HttpSessionListener, etc.
- javax.servlet.http (or jakarta.servlet.http)
    - HTTP-specific classes/interfaces: HttpServlet, HttpServletRequest, HttpServletResponse, HttpSession, Cookie, HttpUpgradeHandler, Part (for multipart/form-data), HttpServletRequestWrapper/ResponseWrapper.

Purpose:

- Standardizes how servlets handle requests/responses.
- Provides lifecycle hooks and configuration mechanisms.
- Supports filters, listeners, async processing, multipart, security, and session management.

Note on naming:

- Since Servlet 5.0+ under Jakarta EE 9+, packages changed from javax.* to jakarta.*. Use the correct namespace based on container version.


## 5) Using Annotations in Servlets (@WebServlet)

Annotations simplify configuration by eliminating or reducing web.xml entries.

@WebServlet:

- Declares a servlet and its URL mappings directly on the class.
- Supports name, urlPatterns (or value), initParams, loadOnStartup, asyncSupported, etc.

Example basic:

```java
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;

@WebServlet("/hello")
public class HelloServlet extends HttpServlet { /* doGet/doPost... */ }
```

Multiple URL patterns with init params:

```java
import jakarta.servlet.annotation.WebInitParam;
import jakarta.servlet.annotation.WebServlet;

@WebServlet(
    name = "GreetServlet",
    urlPatterns = {"/greet", "/welcome/*"},
    initParams = {
        @WebInitParam(name = "greeting", value = "Namaste")
    },
    loadOnStartup = 1,
    asyncSupported = false
)
public class GreetServlet extends HttpServlet { /* override doGet */ }
```

How it simplifies:

- No need to define <servlet> and <servlet-mapping> in web.xml.
- Co-locates configuration with code; easier maintenance.
- Still possible to mix with web.xml; web.xml can override annotations when needed.

Related annotations:

- @WebFilter for filters.
- @WebListener for listeners.
- @MultipartConfig for file uploads on a servlet.


## 6) ServletConfig vs ServletContext

Purpose:

- ServletConfig: Per-servlet configuration parameters provided by deployment descriptor or annotations; accessible within that servlet.
- ServletContext: Application-wide context shared across all servlets in the web app; holds global params and resources.

Scope and lifecycle:

- ServletConfig: Created by container per servlet instance and passed to init(); exists for that servlet’s lifetime.
- ServletContext: Created when the web application starts; destroyed when app stops; one per web app.

Common methods and usage:

ServletConfig:

- getInitParameter(String name): get a servlet’s init-param.
- getInitParameterNames(): enumerate parameters.
- getServletName(): name.
- getServletContext(): access the shared ServletContext.

ServletContext:

- getInitParameter(String name)/getInitParameterNames(): context-wide init params (from web.xml).
- setAttribute(String name, Object obj)/getAttribute(String name)/removeAttribute(String): share objects (e.g., DataSource) across servlets.
- getRequestDispatcher(String path): forward/include to resources.
- getResource/getResourceAsStream: access resources from the WAR.
- log(String msg, Throwable t): container logging.
- getContextPath(): application context path.

Examples:

web.xml (context and servlet params):

```xml
<context-param>
  <param-name>appTitle</param-name>
  <param-value>Student Portal</param-value>
</context-param>

<servlet>
  <servlet-name>StudentServlet</servlet-name>
  <servlet-class>com.example.StudentServlet</servlet-class>
  <init-param>
    <param-name>pageSize</param-name>
    <param-value>20</param-value>
  </init-param>
</servlet>
<servlet-mapping>
  <servlet-name>StudentServlet</servlet-name>
  <url-pattern>/students</url-pattern>
</servlet-mapping>
```

In servlet:

```java
@Override
public void init(ServletConfig config) throws ServletException {
    super.init(config);
    String pageSize = config.getInitParameter("pageSize"); // ServletConfig
    ServletContext ctx = config.getServletContext();
    String appTitle = ctx.getInitParameter("appTitle");    // ServletContext
    ctx.setAttribute("DB_POOL", myDataSource);             // Shared resource
}
```

Differences summary:

- Granularity: Config = per servlet; Context = entire web app.
- Use cases: Config = servlet-specific defaults; Context = shared resources/settings.
- Creation: Config passed to init(); Context available from start to end of app.


## 7) Session Tracking in Servlets

What is session tracking?

- HTTP is stateless; session tracking maintains state across multiple requests from the same client.
- Common mechanisms: HttpSession (server-side), cookies (JSESSIONID), URL rewriting, hidden form fields, SSL session IDs.

How it works with HttpSession:

- The container creates or retrieves an HttpSession associated with a JSESSIONID.
- The ID is typically stored in a cookie; if cookies are disabled, URL rewriting can append ;jsessionid=... to links.
- Data is stored as attributes on the session object.

Basic example:

```java
@Override
protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
    HttpSession session = req.getSession(true); // create if absent
    Integer count = (Integer) session.getAttribute("count");
    if (count == null) count = 0;
    session.setAttribute("count", count + 1);

    resp.setContentType("text/plain;charset=UTF-8");
    resp.getWriter().println("Visits this session: " + (count + 1));
}
```

Setting and reading attributes:

```java
session.setAttribute("user", userObj);
User user = (User) session.getAttribute("user");
```

Session configuration:

- Timeout: setMaxInactiveInterval(seconds) or in web.xml:

```xml
<session-config>
  <session-timeout>30</session-timeout> <!-- minutes -->
</session-config>
```

URL rewriting fallback:

```java
String url = resp.encodeURL(req.getContextPath() + "/cart");
```

Cookies alternative:

- Manual cookie handling for simple tracking:

```java
Cookie c = new Cookie("theme", "dark");
c.setMaxAge(7 * 24 * 60 * 60);
c.setHttpOnly(true);
c.setPath(req.getContextPath());
resp.addCookie(c);
```

Security best practices:

- Mark session cookies HttpOnly and Secure (when using HTTPS).
- Regenerate session ID after login to prevent fixation:

```java
req.changeSessionId();
```

- Avoid storing sensitive data directly in the session; store minimal identifiers.
- Implement logout:

```java
req.getSession().invalidate();
```

File upload note (sessions and multipart):

- When using multipart forms, annotate the servlet with @MultipartConfig and access parts via request.getPart("file"); session usage remains the same.

—

If any code needs to target javax.* (Servlet 3.1/4.0) vs jakarta.* (Servlet 5.0+), adjust import packages accordingly based on the server (e.g., Tomcat 9 uses javax.*, Tomcat 10+ uses jakarta.*).


<div class="newtopic"></div>

# Assignment 3


## 1) What is JSP (JavaServer Pages)?

JSP is a server-side technology that allows embedding Java code into HTML to generate dynamic web content; at runtime, a JSP is translated into a servlet, compiled, loaded, and executed by the container to produce the response. JSP supports features like automatic translation-to-servlet, implicit objects (request, response, session, application), and lifecycle hooks (jspInit, _jspService, jspDestroy). Compared to writing raw servlets, JSP is advantageous for view-centric pages because HTML authoring is more natural, Java can be inserted where needed, and the container manages translation/compilation automatically.[1][2][3]

## 2) JSP Architecture

JSP follows the standard web app stack where the browser sends an HTTP request to the web server, which forwards it to the JSP engine (in the servlet container); the engine checks if compilation is needed, translates the JSP into a servlet, compiles it, loads it, and invokes it to create the dynamic response. Conceptually, this aligns with a three-layer architecture: presentation (JSP), business logic (Java classes/beans/services), and data access (databases), with JSP primarily handling the presentation layer and delegating logic to Java classes or beans. During request processing, the steps are: parse JSP, generate servlet source, compile to class, instantiate, initialize via jspInit(), and handle the request via _jspService(), then write the response back to the client.[2][1]

## 3) Phases of the JSP Lifecycle

- Translation: The JSP file is parsed and converted into a Java servlet source file (e.g., test.java).[1][2]
- Compilation: The generated Java servlet is compiled into bytecode (test.class).[2][1]
- Class loading and instantiation: The class is loaded and an instance is created by the container.[1]
- Initialization: The container calls jspInit() once for initialization tasks.[2][1]
- Request processing: For each request, the container invokes _jspService(request, response), which corresponds to the JSP body and should not be overridden by the author.[4][3][1]
- Destruction: Before removal, the container calls jspDestroy() to release resources.[1][2]

Typical example pattern: define setup in jspInit(), use JSP elements in the page body to generate output (which becomes _jspService()), and clean up in jspDestroy().[3][2][1]

## 4) Role of jspInit(), _jspService(), and jspDestroy()

- jspInit(): Called once when the JSP is initialized; use to open resources such as DB connections or caches.[3][2][1]
- _jspService(): Automatically generated method that contains the body of the JSP and handles each request; it should never be defined by the JSP author.[4][3]
- jspDestroy(): Called once when the JSP is about to be destroyed; use to release resources.[4][3][2][1]

The JSP container manages these methods: it generates _jspService(), and invokes jspInit() before servicing requests and jspDestroy() during cleanup; authors may override jspInit() and jspDestroy(), but not _jspService().[5][3][4][1]

## 5) Types of JSP Elements (syntax and examples)

- Expressions: Insert the value of a Java expression into the output; syntax:  (e.g., ).
- Scriptlets: Embed arbitrary Java code in the JSP; syntax: .
- Declarations: Declare fields or methods that become class members outside _jspService(); syntax:  (e.g., ).
- Directives: Provide instructions to the container at translation time; syntax:  (e.g., page directive).
- JSP comments: Syntax: , not sent to the client.

Declarations create class-level members in the generated servlet, while expressions write directly to the response without needing out.println().

## 6) Compare JSP with Servlets

Both JSP and servlets ultimately execute as servlets, but JSP emphasizes view templating by mixing HTML with small Java snippets, which is more convenient for page authoring. JSP reduces boilerplate around writing HTML from Java (avoids many out.println calls) and is automatically translated and compiled by the container on first use or when modified. Servlets are better for complex controller logic, while JSPs are ideal for presentation with optional use of JavaBeans or tags for cleaner separation of concerns.

## 7) How JSP supports dynamic content generation

JSP generates dynamic content by executing Java code within the page (scriptlets, expressions) and by using implicit objects such as request, session, and application to read user input and state during _jspService(). On each request, the container invokes the generated _jspService(request, response) method, which accesses parameters, interacts with business logic, and writes dynamic output to the response stream. Because the JSP is compiled to a servlet and recompiled on changes, dynamic user-driven content (form inputs, query parameters, session data) is computed at request time and delivered as HTML, JSON, or other formats.

Notes and best practices: Prefer minimal Java in JSP and delegate logic to beans/tags; authors should not define _jspService(); override jspInit()/jspDestroy() only for setup/cleanup when necessary.