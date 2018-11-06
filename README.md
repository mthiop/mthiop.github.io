# mthiop.github.io

To deploy:
$ cd post
$ sudo idyll build
$ cp -r build/* ..
$ git add <yourChanges>
$ git commit -m <YourMessage>
$ git push

To Test:
$ cd post
$ sudo idyll
$ firefox http://localhost:3000
