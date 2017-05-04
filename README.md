# Name voting Firebase + Angular 1.x project

## Description

This project allows you to host a name voting page which updates the results in real time.

## Installation

```bash
git checkout https://github.com/dvdcastro/name_voting.git
cd name_voting
bower install
```

## Configuration

*1.* Create a [firebase](https://firebase.google.com/) account and a project.

*2.* Enable anonymous auth:
     In the [Firebase console](https://console.firebase.google.com/), open the _Auth_ section.
     On the _Sign-in Methods_ page, enable the _Anonymous_ sign-in method.

*3.* Create a ```.firebaserc``` file. You can copy the base file.

```bash
cp .firebaserc.base .firebaserc
```

*4.* Edit this file by adding your firebase project identifier.

Create a ```js/conf.js``` file. You can copy the base file.

```bash
cp .firebaserc.base .firebaserc
```

Edit this file by adding your firebase project data, you can get this from the firebase console.

## Deployment

Once everything is configured, make sure to [install firebase cli in your system](https://firebase.google.com/docs/hosting/quickstart).

Then, just deploy the app.

```bash
firebase deploy
```

The script should tell you where to go in your browser.

## Usage

There are 2 ways of accessing this site

* As an admin
* As a voter

### Admin

To access as an admin:

```
<your firebase url>/!#/admin
```

As an admin, you can create voting rooms and check out the results in other rooms.

### Voter

To access as a voter:

```
<your firebase url>/
```

As a voter you can register, login, vote and look at the results that others have sent.