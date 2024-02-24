# Redis Collections for SoapJS (WIP)

This package provides a set of Redis collections that integrate seamlessly with the SoapJS framework, enabling efficient and structured data handling in Redis databases. It includes implementations for common Redis data structures like hashes, lists, sets, and sorted sets.

## Collections Included

- **RedisHashCollection**: Manages Redis hashes, allowing storage and retrieval of data associated with a key.
- **RedisListCollection**: Facilitates operations on Redis lists, supporting pushing, popping, and range queries.
- **RedisSetCollection**: Provides methods for handling Redis sets, including adding, removing, and querying members.
- **RedisSortedSetCollection**: Deals with Redis sorted sets, enabling sorted data management and range-based queries.

## Installation

To install the package, run the following command in your project directory:

```bash
npm install @soapjs/soap-node-redis
```

Ensure that you have the core `@soapjs/soap` and `redis` packages installed, as these collections depend on it.

## Usage

1. Import the necessary components from the package:

   ```typescript
   import {
     RedisListCollection,
     RedisConfig,
     RedisQueryFactory,
     RedisSource,
     RedisUtils
   } from '@soapjs/soap-node-redis';
   ```

2. Set up your Redis configuration:

   ```typescript
   const config = new RedisConfig({
     hosts: ['localhost'],
     ports: ['27017'],
     iana: false,
     user: 'admin',
     password: 'admin',
     database: 'my_redis_db'
   });
   ```

3. Create a new `RedisSource` instance:

   ```typescript
   const redisSource = await RedisSource.create(config);
   ```

4. Use collection to perform database operations:

   ```typescript
   const collection = new RedisListCollection<MyDocumentType>(redisSource, 'users');
   const documents = await collection.list();
   ```

## Limitations and Contributions

The current implementation covers basic functionalities of Redis collections. It is an ongoing project, and contributions are welcome to extend the capabilities and add new features.

## Documentation

For detailed documentation and additional usage examples, visit [SoapJS documentation](https://docs.soapjs.com).

## Issues
If you encounter any issues, please feel free to report them [here](https://github.com/soapjs/soap/issues/new/choose).

## Contact
For any questions, collaboration interests, or support needs, you can contact us through the following:

- Official:
  - Email: [contact@soapjs.com](mailto:contact@soapjs.com)
  - Website: https://soapjs.com
- Radoslaw Kamysz:
  - Email: [radoslaw.kamysz@gmail.com](mailto:radoslaw.kamysz@gmail.com)
  - Warpcast: [@k4mr4ad](https://warpcast.com/k4mr4ad)
  - Twitter: [@radoslawkamysz](https://x.com/radoslawkamysz)

## License

@soapjs/soap-node-redis is [MIT licensed](./LICENSE).
