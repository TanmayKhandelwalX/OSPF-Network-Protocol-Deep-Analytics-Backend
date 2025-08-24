# OSPF Network Protocol Deep Analytics Backend

A comprehensive backend solution for analyzing OSPF (Open Shortest Path First) network protocol data with network analytics capabilities.

## 🏗️ Architecture Overview

![Project Architecture](./Backend_Flow.png)

*Architecture diagram showing the flow between Node.js backend, MongoDB, Redis, and AI APIs*

## 🚀 Features

- **OSPF Protocol Analysis**: Transition Latancy insights into network routing behavior
- **Real-time Analytics**: Live monitoring and analysis of network data
- **Multi-database Support**: MongoDB for data storage, Redis for caching
- **AI Integration**: Powered by Perplexity and Gemini APIs for intelligent analysis

## 📋 Prerequisites

- Node.js (managed via NVM)
- MongoDB Atlas account
- Redis server
- API keys for Perplexity and Gemini

## 🛠️ Installation & Setup

### Step 1: Node.js and Node Version Manager Setup

Install NVM (Node Version Manager) to easily manage Node.js versions:

1. Follow the installation instructions at: https://github.com/nvm-sh/nvm
2. Refer to the **Installing and Updating** section for your operating system
3. After installing NVM, follow the **Usage** section to install Node.js

```bash
# Example commands (refer to official docs for latest instructions)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install node
nvm use node
```

### Step 2: MongoDB Setup

1. Create an account on [MongoDB Atlas](https://www.mongodb.com/atlas/database](https://www.mongodb.com/cloud/atlas))
2. Create a new cluster and database
3. Copy the connection string from your cluster
4. Follow the connection guide: [MongoDB & Node.js: Connecting & CRUD Operations](https://www.youtube.com/watch?v=fbYExfeFsI0)

### Step 3: Redis Database Setup


#### Option A: Local Redis Installation
1. Install Redis locally following the official guide: [Install Redis Open Source](https://redis.io/docs/latest/operate/oss_and_stack/install/install-stack/)
2. Start Redis server:

```bash
redis-server
```

#### Option B: Cloud Redis (Recommended for Production)

**Using Redis Cloud:**
1. Create an account on [Redis Cloud](https://redis.com/redis-enterprise-cloud/)
2. Create a new database subscription
3. Choose your cloud provider (AWS, GCP, or Azure)
4. Select database configuration and region
5. Copy the connection string from your database dashboard
6. The connection string format: `redis://username:password@host:port`

### Step 4: API Keys Required

Obtain the following API keys:

- **Perplexity API Key**: [Quickstart - Perplexity](https://docs.perplexity.ai/getting-started/quickstart)
- **Gemini API Key**: [Gemini API | Google AI for Developers](https://ai.google.dev/gemini-api/docs#javascript)

### Step 5: Configuration Files

#### Create constants.js
```bash
cp constants_sample.js constants.js
```
Fill in the required values in `constants.js`

#### Create .env file
```bash
cp .env.sample .env
```
Fill in the required environment variables in `.env`

**Note**: Ollama integration is optional

### Step 6: Run the Application

#### Quick Start (Recommended)
```bash
npm run dev
# or
npm run main
```
This command will automatically install all required packages and start the application.

#### Manual Installation
Alternatively, you can install dependencies manually:

```bash
# View dependencies in package.json and install each one
npm install 
```