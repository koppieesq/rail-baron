# Rail Baron

Rail Baron is a board game from Avalon Hill: https://en.wikipedia.org/wiki/Rail_Baron

## Installation

To run this website locally, you need to do the following:

1. Install git (if you're on a Mac, this is preinstalled)
1. *Optional*: Install [Homebrew](https://brew.sh/)
1. Install [DDEV](https://ddev.com/get-started/) (with [Orb](https://orbstack.dev/) to support Docker)
1. Check out this repository from GitHub (preferably using SSH with a private key)
1. Set up DDEV with your SSH private key: `ddev auth ssh`
1. Start your local virtual machine: `ddev start`
1. Install backend dependencies: `ddev composer install`
1. This will start the backend server
1. ssh into DDEV: `ddev ssh`
1. Install frontend dependencies:
```
cd frontend
npm install
```

## Running locally

You can run the new website locally on your own computer, for easy development without needing to deploy to a remote server.  See **Installation** above, for prerequisites.

1. Start the server: `ddev start`
1. This will start both the frontend and backend sites

**Note:** In this architecture, code flows _downstream_, from a local computer to the server, while data flows _upstream_, from the live server to your local computer.  Make sure you don't accidentally push your database to the server!

### Switching branches

After you switch branches or import the db, you will want to reset your local environment:

```
ddev composer install
ddev drush deploy
```

## Deployment

We will use something similar to **trunk based development,** which means feature branches are short-lived and merge directly back to the `main` branch.  `main` is **protected,** which means you can only merge to `main` if you complete a **merge request:**

1. Check out a new git branch: `git checkout -b feature_branch_name`
1. When you're done, commit your changes with a note: `git commit -am "I made a change"`
1. Push your feature branch to the GitHub repository: `git push`
1. Create a new pull request on GitHub
1. Ask someone for a code review
1. **Wait until the PR is approved**
1. Merge the PR

Once merged, deploy the changes:

1. Run the build script: `sh build.sh`
1. Push to Kubernetes: `kubectl apply -f k8s/`
1. An automated script will run the deploy steps on the pod
