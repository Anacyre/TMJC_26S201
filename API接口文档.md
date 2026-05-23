# 26S201 Class OS — 后端接口文档

> 本文档根据前端功能模块整理，供后端开发参考。
> 建议统一接口前缀：`/api/v1`
> 所有需要登录的接口均须在请求头携带 `Authorization: Bearer <token>`

---

## 通用响应格式

```json
{
  "code": 200,
  "message": "success",
  "data": { ... }
}
```

错误响应：
```json
{
  "code": 400,
  "message": "错误说明",
  "data": null
}
```

---

## 一、认证模块（Auth）

### 1.1 用户登录

- **接口**：`POST /api/v1/auth/login`
- **描述**：用户名/邮箱 + 密码登录，返回 token
- **请求 Body（JSON）**：

```json
{
  "account": "alex@26s201.edu",    // 用户名或邮箱
  "password": "123456",            // 密码（明文，传输层 HTTPS 加密）
  "rememberMe": true               // 是否保持登录（控制 token 有效期）
}
```

- **响应 data**：

```json
{
  "token": "eyJhbGci...",
  "expiresIn": 604800,             // token 有效秒数（7天 / 1天）
  "user": {
    "id": "m1",
    "name": "Alex Chen",
    "role": "admin",               // admin / member
    "avatar": "",
    "mbti": "INTJ"
  }
}
```

---

### 1.2 用户注册

- **接口**：`POST /api/v1/auth/register`
- **描述**：新建账号，注册成功后不自动登录
- **请求 Body（JSON）**：

```json
{
  "email": "you@example.com",
  "displayName": "Your Name",
  "password": "123456",
  "confirmPassword": "123456"
}
```

- **响应 data**：

```json
{
  "message": "注册成功，请登录"
}
```

- **校验规则**：密码不少于6位；email 唯一校验；confirmPassword 一致性校验

---

### 1.3 忘记密码（发送重置邮件）

- **接口**：`POST /api/v1/auth/forgot-password`
- **描述**：向邮箱发送密码重置链接
- **请求 Body（JSON）**：

```json
{
  "email": "alex@26s201.edu"
}
```

- **响应 data**：

```json
{
  "message": "重置邮件已发送"
}
```

---

### 1.4 退出登录

- **接口**：`POST /api/v1/auth/logout`
- **描述**：使当前 token 失效（服务端维护黑名单或直接由前端清除本地 token 即可）
- **请求 Body**：空
- **响应 data**：`null`

---

### 1.5 获取当前登录用户信息

- **接口**：`GET /api/v1/auth/me`
- **描述**：根据 token 返回当前用户完整信息
- **响应 data**：

```json
{
  "id": "m1",
  "name": "Alex Chen",
  "role": "admin",
  "mbti": "INTJ",
  "interests": "Design Systems · Notes",
  "bio": "Calm and structured. Building class workflows.",
  "links": ["github.com/alex", "notion.so/alex"],
  "birthdayVisibility": "Friends",  // Private / Friends / Class
  "avatar": ""
}
```

---

## 二、用户/成员模块（Users）

### 2.1 获取班级成员列表

- **接口**：`GET /api/v1/users`
- **描述**：返回全班成员列表（用于成员浏览页）
- **响应 data**：

```json
[
  {
    "id": "m1",
    "name": "Alex Chen",
    "mbti": "INTJ",
    "interests": "Design Systems · Notes",
    "bio": "Calm and structured. Building class workflows.",
    "links": ["github.com/alex", "notion.so/alex"],
    "avatar": ""
  }
]
```

---

### 2.2 获取指定用户资料

- **接口**：`GET /api/v1/users/:id`
- **描述**：查看某位成员的个人资料页（含其上传笔记数、发帖数等统计）
- **响应 data**：

```json
{
  "id": "m2",
  "name": "Mina Park",
  "mbti": "ENFP",
  "interests": "Music · Community",
  "bio": "Love creating social study spaces.",
  "links": ["x.com/mina"],
  "avatar": "",
  "uploadedNotesCount": 3,
  "recentPostTitles": ["Drop your deep focus playlist"]
}
```

---

### 2.3 更新当前用户资料

- **接口**：`PUT /api/v1/users/:id`
- **描述**：更新自己的个人资料（仅本人可操作）
- **请求 Body（JSON）**：

```json
{
  "name": "Alex Chen",
  "mbti": "INTJ",
  "interests": "Design Systems · Notes",
  "bio": "Calm and structured.",
  "links": ["github.com/alex"],
  "birthdayVisibility": "Friends",   // Private / Friends / Class
  "avatar": "https://cdn.xxx/avatar.jpg"
}
```

- **响应 data**：更新后的完整用户对象（同 2.2）

---

## 三、任务规划模块（Tasks）

### 3.1 获取任务列表

- **接口**：`GET /api/v1/tasks`
- **描述**：获取当前用户的所有任务
- **Query 参数**：

| 参数 | 类型 | 说明 |
|------|------|------|
| status | string | 筛选：today / upcoming / overdue / completed |
| subject | string | 按科目筛选 |

- **响应 data**：

```json
[
  {
    "id": "t1",
    "title": "Complete Chapter 5 Q1-4",
    "description": "Finish the practice set and submit before class.",
    "deadline": "2026-05-24",
    "subject": "Math",
    "priority": "P1",              // P1 / P2 / P3
    "status": "today",             // today / upcoming / overdue / completed
    "reminder": "18:30",           // HH:mm 或 null
    "done": false,
    "checklist": [
      { "id": "t1-c1", "text": "Review notes", "done": false },
      { "id": "t1-c2", "text": "Solve Q1-4", "done": false }
    ],
    "relatedNotice": { "id": "n1", "title": "Chapter 5 submission reminder" },
    "sourceNoticeId": "n1"
  }
]
```

---

### 3.2 创建任务

- **接口**：`POST /api/v1/tasks`
- **描述**：新建一条任务（手动创建或从通知转入）
- **请求 Body（JSON）**：

```json
{
  "title": "New task",
  "description": "Task detail",
  "deadline": "2026-05-30",
  "subject": "Math",
  "priority": "P2",
  "status": "today",
  "reminder": "18:00",
  "checklist": [
    { "text": "Step 1", "done": false }
  ],
  "sourceNoticeId": "n1",          // 可选，从通知创建时传入
  "relatedNotice": {               // 可选
    "id": "n1",
    "title": "Chapter 5 submission reminder"
  }
}
```

- **响应 data**：创建成功的任务完整对象（同 3.1 单条格式）

---

### 3.3 获取单条任务详情

- **接口**：`GET /api/v1/tasks/:id`
- **响应 data**：同 3.1 单条格式

---

### 3.4 更新任务

- **接口**：`PUT /api/v1/tasks/:id`
- **描述**：编辑任务所有字段（含 checklist）
- **请求 Body（JSON）**：同 3.2 创建格式（传需要更新的字段）
- **响应 data**：更新后的任务对象

---

### 3.5 删除任务

- **接口**：`DELETE /api/v1/tasks/:id`
- **响应 data**：`null`

---

### 3.6 切换任务完成状态

- **接口**：`PATCH /api/v1/tasks/:id/toggle-done`
- **描述**：快速切换任务的 done 状态（done true/false 对应 status → completed / today）
- **请求 Body**：空
- **响应 data**：

```json
{
  "id": "t1",
  "done": true,
  "status": "completed"
}
```

---

### 3.7 切换 Checklist 项状态

- **接口**：`PATCH /api/v1/tasks/:id/checklist/:checklistId`
- **描述**：切换某个子任务项的完成状态
- **请求 Body**：空
- **响应 data**：

```json
{
  "id": "t1-c1",
  "done": true
}
```

---

## 四、通知/班级公告模块（Notifications）

### 4.1 获取通知列表

- **接口**：`GET /api/v1/notifications`
- **描述**：获取当前用户的班级通知列表
- **Query 参数**：

| 参数 | 类型 | 说明 |
|------|------|------|
| hidden | boolean | true=获取隐藏通知，false/不传=获取可见通知 |
| important | boolean | 筛选重要通知 |

- **响应 data**：

```json
[
  {
    "id": "n1",
    "type": "Homework",             // Homework / VIA / Event / General
    "title": "Chapter 5 Q1-4 submission reminder",
    "subject": "Math",
    "deadline": "2026-05-24",
    "description": "Submit before 23:59 tonight.",
    "attachment": "worksheet.pdf",   // 附件文件名，无附件为 ""
    "attachmentUrl": "https://cdn.xxx/worksheet.pdf",  // 附件下载链接
    "hidden": false,
    "read": false,
    "important": true,
    "inPlanner": false,
    "by": "Admin",
    "createdAt": "2026-05-12T08:00:00Z"
  }
]
```

---

### 4.2 获取单条通知详情

- **接口**：`GET /api/v1/notifications/:id`
- **响应 data**：同 4.1 单条格式

---

### 4.3 创建通知（仅管理员）

- **接口**：`POST /api/v1/notifications`
- **权限**：role = admin
- **请求 Body（JSON）**：

```json
{
  "type": "Homework",
  "title": "Chapter 5 Q1-4 submission reminder",
  "subject": "Math",
  "deadline": "2026-05-24",
  "description": "Submit before 23:59 tonight.",
  "attachment": "n1-worksheet.pdf",   // 先用 /api/v1/upload 上传，传返回的 fileName
  "important": true
}
```

- **响应 data**：创建的通知完整对象

---

### 4.4 标记通知为已读

- **接口**：`PATCH /api/v1/notifications/:id/read`
- **请求 Body**：空
- **响应 data**：`{ "id": "n1", "read": true }`

---

### 4.5 切换重要标记

- **接口**：`PATCH /api/v1/notifications/:id/toggle-important`
- **响应 data**：`{ "id": "n1", "important": true }`

---

### 4.6 切换隐藏状态

- **接口**：`PATCH /api/v1/notifications/:id/toggle-hidden`
- **描述**：隐藏 / 取消隐藏通知
- **响应 data**：`{ "id": "n1", "hidden": true }`

---

### 4.7 设置通知加入规划器状态

- **接口**：`PATCH /api/v1/notifications/:id/planner`
- **请求 Body（JSON）**：`{ "inPlanner": true }`
- **响应 data**：`{ "id": "n1", "inPlanner": true }`

---

### 4.8 删除通知（仅管理员）

- **接口**：`DELETE /api/v1/notifications/:id`
- **权限**：role = admin
- **响应 data**：`null`

---

## 五、社区模块（Community）

### 5.1 获取社区列表

- **接口**：`GET /api/v1/communities`
- **响应 data**：

```json
[
  {
    "id": "c1",
    "icon": "♪",
    "name": "Music",
    "desc": "Share playlists and jam ideas.",
    "onlineCount": 18,
    "activeCount": 42,
    "latestPostTitle": "Late night lo-fi playlist drop"
  }
]
```

---

### 5.2 创建社区（仅管理员）

- **接口**：`POST /api/v1/communities`
- **权限**：role = admin
- **请求 Body（JSON）**：

```json
{
  "icon": "◉",
  "name": "Gaming",
  "desc": "Events, rankings, quick squads."
}
```

- **响应 data**：创建的社区对象

---

### 5.3 获取社区详情

- **接口**：`GET /api/v1/communities/:id`
- **响应 data**：同 5.1 单条格式

---

### 5.4 获取帖子列表（支持多种排序）

- **接口**：`GET /api/v1/posts`
- **描述**：获取全部帖子，支持排序和社区筛选
- **Query 参数**：

| 参数 | 类型 | 说明 |
|------|------|------|
| communityId | string | 按社区筛选 |
| sort | string | hot（按点赞降序）/ new（按时间降序）/ top（按评论降序） |
| page | number | 页码（从 1 开始） |
| pageSize | number | 每页条数，默认 20 |

- **响应 data**：

```json
{
  "total": 100,
  "list": [
    {
      "id": "p1",
      "communityId": "c4",
      "communityName": "Coding",
      "title": "Best way to structure study sprints?",
      "author": "Alex Chen",
      "authorId": "m1",
      "anonymous": false,
      "likesCount": 38,
      "commentsCount": 12,
      "image": "",
      "createdAt": "2026-05-12T07:00:00Z"
    }
  ]
}
```

---

### 5.5 创建帖子

- **接口**：`POST /api/v1/posts`
- **请求 Body（JSON）**：

```json
{
  "communityId": "c4",
  "title": "New post title",
  "content": "Full post body content...",
  "anonymous": false,
  "image": "https://cdn.xxx/post-img.jpg"    // 可选，图片 URL
}
```

- **响应 data**：创建的帖子对象（同 5.4 单条格式）

---

### 5.6 获取帖子详情

- **接口**：`GET /api/v1/posts/:id`
- **响应 data**：

```json
{
  "id": "p1",
  "communityId": "c4",
  "communityName": "Coding",
  "title": "Best way to structure study sprints?",
  "content": "Full post body...",
  "author": "Alex Chen",
  "authorId": "m1",
  "anonymous": false,
  "likesCount": 38,
  "commentsCount": 12,
  "image": "",
  "liked": false,
  "createdAt": "2026-05-12T07:00:00Z"
}
```

---

### 5.7 点赞帖子

- **接口**：`PATCH /api/v1/posts/:id/like`
- **描述**：切换点赞状态（已赞则取消）
- **响应 data**：`{ "id": "p1", "liked": true, "likesCount": 39 }`

---

### 5.8 获取帖子评论列表

- **接口**：`GET /api/v1/posts/:id/comments`
- **响应 data**：

```json
[
  {
    "id": "k1",
    "postId": "p1",
    "author": "Mina Park",
    "authorId": "m2",
    "anonymous": false,
    "text": "Try 45m focus + 10m reset blocks.",
    "createdAt": "2026-05-12T07:08:00Z"
  }
]
```

---

### 5.9 发表评论

- **接口**：`POST /api/v1/posts/:id/comments`
- **请求 Body（JSON）**：

```json
{
  "text": "My comment content",
  "anonymous": false
}
```

- **响应 data**：创建的评论对象（同 5.8 单条格式）

---

## 六、学习资源模块（Study）

### 6.1 获取科目列表

- **接口**：`GET /api/v1/subjects`
- **响应 data**：

```json
[
  {
    "id": "s1",
    "icon": "∑",
    "name": "H2 Mathematics",
    "filesCount": 42,
    "updatedAt": "2026-05-12T07:00:00Z"
  }
]
```

---

### 6.2 获取指定科目的资源列表

- **接口**：`GET /api/v1/subjects/:id/resources`
- **Query 参数**：

| 参数 | 类型 | 说明 |
|------|------|------|
| sort | string | latest / downloads / likes |

- **响应 data**：

```json
[
  {
    "id": "r1",
    "subjectId": "s1",
    "subjectName": "H2 Mathematics",
    "type": "PDF",                   // PDF / DOCX / PNG / XLSX 等
    "title": "Linear Algebra Midterm Notes",
    "uploaderId": "m1",
    "uploaderName": "Alex Chen",
    "downloadsCount": 122,
    "likesCount": 48,
    "liked": false,
    "fileUrl": "https://cdn.xxx/r1.pdf",
    "fileSize": 204800,              // 文件大小（字节）
    "createdAt": "2026-05-12T06:00:00Z"
  }
]
```

---

### 6.3 获取所有最新资源

- **接口**：`GET /api/v1/resources`
- **Query 参数**：

| 参数 | 类型 | 说明 |
|------|------|------|
| sort | string | latest / downloads / likes，默认 latest |
| subjectId | string | 按科目筛选 |
| page | number | 页码 |
| pageSize | number | 每页条数，默认 20 |

- **响应 data**：

```json
{
  "total": 50,
  "list": [ ...同 6.2 格式... ]
}
```

---

### 6.4 上传学习资源

- **接口**：`POST /api/v1/resources`
- **描述**：先调用 7.1 文件上传接口获取 fileKey，再调此接口注册资源信息
- **请求 Body（JSON）**：

```json
{
  "subjectId": "s1",
  "title": "New Notes Title",
  "type": "PDF",
  "fileKey": "uploads/abc123.pdf"   // 从 /api/v1/upload 返回的 key
}
```

- **响应 data**：创建的资源对象（同 6.2 单条格式）

---

### 6.5 点赞资源

- **接口**：`PATCH /api/v1/resources/:id/like`
- **描述**：切换点赞状态
- **响应 data**：`{ "id": "r1", "liked": true, "likesCount": 49 }`

---

### 6.6 下载资源（记录下载数）

- **接口**：`POST /api/v1/resources/:id/download`
- **描述**：记录下载行为并返回下载链接（或直接重定向）
- **响应 data**：

```json
{
  "downloadUrl": "https://cdn.xxx/r1.pdf?token=xxx",
  "downloadsCount": 123
}
```

---

## 七、文件上传模块（Upload）

### 7.1 通用文件上传

- **接口**：`POST /api/v1/upload`
- **描述**：上传单个文件（通知附件、学习资源文件、用户头像等）
- **请求格式**：`multipart/form-data`
- **请求字段**：

| 字段 | 类型 | 说明 |
|------|------|------|
| file | File | 文件本体 |
| type | string | 用途分类：avatar / resource / attachment |

- **响应 data**：

```json
{
  "fileKey": "uploads/2026/05/abc123.pdf",
  "fileName": "Linear_Algebra.pdf",
  "fileUrl": "https://cdn.xxx/uploads/2026/05/abc123.pdf",
  "fileSize": 204800,
  "mimeType": "application/pdf"
}
```

---

## 八、全局搜索模块（Search）

### 8.1 全局搜索

- **接口**：`GET /api/v1/search`
- **描述**：跨模块搜索（通知、任务、帖子、资源、成员）
- **Query 参数**：

| 参数 | 类型 | 说明 |
|------|------|------|
| q | string | 搜索关键词 |
| type | string | 可选，限定搜索范围：notifications / tasks / posts / resources / members |

- **响应 data**：

```json
{
  "notifications": [
    { "id": "n1", "title": "Chapter 5...", "type": "Homework" }
  ],
  "tasks": [
    { "id": "t1", "title": "Complete Chapter 5...", "status": "today" }
  ],
  "posts": [
    { "id": "p1", "title": "Best way to...", "communityName": "Coding" }
  ],
  "resources": [
    { "id": "r1", "title": "Linear Algebra...", "type": "PDF" }
  ],
  "members": [
    { "id": "m2", "name": "Mina Park", "mbti": "ENFP" }
  ]
}
```

---

## 附录：数据字段说明

### 任务状态（Task.status）
| 值 | 说明 |
|----|------|
| today | 今日任务 |
| upcoming | 即将到来 |
| overdue | 已过期 |
| completed | 已完成 |

### 任务优先级（Task.priority）
| 值 | 说明 |
|----|------|
| P1 | 高优先级 |
| P2 | 中优先级 |
| P3 | 低优先级 |

### 通知类型（Notification.type）
| 值 | 说明 |
|----|------|
| Homework | 作业 |
| VIA | VIA（社区服务活动） |
| Event | 活动/比赛 |
| General | 通用通知 |

### 生日可见性（User.birthdayVisibility）
| 值 | 说明 |
|----|------|
| Private | 仅自己可见 |
| Friends | 好友可见 |
| Class | 全班可见 |

### 用户角色（User.role）
| 值 | 说明 |
|----|------|
| admin | 管理员（班干部），可发布通知、创建社区 |
| member | 普通成员 |

---

*文档生成时间：2026-05-12*
