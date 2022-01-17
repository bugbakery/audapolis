# audapolis electron app
This directory contains the code for the main audapolis electron app that is the user facing component of audapolis.

Code in the `src` directory runs in electrons renderer process.

## Installation & Usage

Install the dependencies of the electron app:
```npm install```

Also make sure to install the dependencies for the python server that is started by the electron app.
For that, see [../server/README.md](../server/README.md)

After installing the dependencies, run the app:
```npm start```

## Code checks & tests

Please dont forget to format your code before committing:
```npm run fmt```

And also lint it:
```npm run check```

You can either run the checks manually or use the [pre-commit](https://pre-commit.com)-hook.
To do that install `pre-commit` using you system package manager or by running

```sh
pip install pre-commit
```

After that install the hook by running

```sh
pre-commit install
```

Now the code will be checked every time you commit.
