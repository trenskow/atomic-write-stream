@trenskow/atomic-write-stream
----

A writeable file stream that writes atomically.

# Usage

Usage is works in exactly the same way as Node's build-in `createWriteStream` except it writes atomically and supports some options.

````javascript
import createAtomicWriteStream from '@trenskow/atomic-write-stram';

const stream = createAtomicWriteStream('hello.txt', {
	tmpDirectory: '/some/tmp/directory' /* defaults to `os.tmpdir()`. */
});

stream.write('Hello, World!');
stream.end();
````

# LICENSE

See license in LICENSE.
