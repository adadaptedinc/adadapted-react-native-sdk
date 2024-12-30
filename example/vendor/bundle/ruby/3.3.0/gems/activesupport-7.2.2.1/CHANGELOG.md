## Rails 7.2.2.1 (December 10, 2024)

-   No changes.

## Rails 7.2.2 (October 30, 2024)

-   Include options when instrumenting `ActiveSupport::Cache::Store#delete` and `ActiveSupport::Cache::Store#delete_multi`.

    _Adam Renberg Tamm_

-   Print test names when running `rails test -v` for parallel tests.

    _John Hawthorn_, _Abeid Ahmed_

## Rails 7.2.1.2 (October 23, 2024)

-   No changes.

## Rails 7.2.1.1 (October 15, 2024)

-   No changes.

## Rails 7.2.1 (August 22, 2024)

-   No changes.

## Rails 7.2.0 (August 09, 2024)

-   Fix `delegate_missing_to allow_nil: true` when called with implict self

    ```ruby
    class Person
      delegate_missing_to :address, allow_nil: true

      def address
        nil
      end

      def berliner?
        city == "Berlin"
      end
    end

    Person.new.city # => nil
    Person.new.berliner? # undefined local variable or method `city' for an instance of Person (NameError)
    ```

    _Jean Boussier_

-   Add `logger` as a dependency since it is a bundled gem candidate for Ruby 3.5

    _Earlopain_

-   Define `Digest::UUID.nil_uuid`, which returns the so-called nil UUID.

    _Xavier Noria_

-   Support `duration` type in `ActiveSupport::XmlMini`.

    _heka1024_

-   Remove deprecated `ActiveSupport::Notifications::Event#children` and `ActiveSupport::Notifications::Event#parent_of?`.

    _Rafael Mendonça França_

-   Remove deprecated support to call the following methods without passing a deprecator:

    -   `deprecate`
    -   `deprecate_constant`
    -   `ActiveSupport::Deprecation::DeprecatedObjectProxy.new`
    -   `ActiveSupport::Deprecation::DeprecatedInstanceVariableProxy.new`
    -   `ActiveSupport::Deprecation::DeprecatedConstantProxy.new`
    -   `assert_deprecated`
    -   `assert_not_deprecated`
    -   `collect_deprecations`

    _Rafael Mendonça França_

-   Remove deprecated `ActiveSupport::Deprecation` delegation to instance.

    _Rafael Mendonça França_

-   Remove deprecated `SafeBuffer#clone_empty`.

    _Rafael Mendonça França_

-   Remove deprecated `#to_default_s` from `Array`, `Date`, `DateTime` and `Time`.

    _Rafael Mendonça França_

-   Remove deprecated support to passing `Dalli::Client` instances to `MemCacheStore`.

    _Rafael Mendonça França_

-   Remove deprecated `config.active_support.use_rfc4122_namespaced_uuids`.

    _Rafael Mendonça França_

-   Remove deprecated `config.active_support.remove_deprecated_time_with_zone_name`.

    _Rafael Mendonça França_

-   Remove deprecated `config.active_support.disable_to_s_conversion`.

    _Rafael Mendonça França_

-   Remove deprecated support to bolding log text with positional boolean in `ActiveSupport::LogSubscriber#color`.

    _Rafael Mendonça França_

-   Remove deprecated constants `ActiveSupport::LogSubscriber::CLEAR` and `ActiveSupport::LogSubscriber::BOLD`.

    _Rafael Mendonça França_

-   Remove deprecated support for `config.active_support.cache_format_version = 6.1`.

    _Rafael Mendonça França_

-   Remove deprecated `:pool_size` and `:pool_timeout` options for the cache storage.

    _Rafael Mendonça França_

-   Warn on tests without assertions.

    `ActiveSupport::TestCase` now warns when tests do not run any assertions.
    This is helpful in detecting broken tests that do not perform intended assertions.

    _fatkodima_

-   Support `hexBinary` type in `ActiveSupport::XmlMini`.

    _heka1024_

-   Deprecate `ActiveSupport::ProxyObject` in favor of Ruby's built-in `BasicObject`.

    _Earlopain_

-   `stub_const` now accepts a `exists: false` parameter to allow stubbing missing constants.

    _Jean Boussier_

-   Make `ActiveSupport::BacktraceCleaner` copy filters and silencers on dup and clone.

    Previously the copy would still share the internal silencers and filters array,
    causing state to leak.

    _Jean Boussier_

-   Updating Astana with Western Kazakhstan TZInfo identifier.

    _Damian Nelson_

-   Add filename support for `ActiveSupport::Logger.logger_outputs_to?`.

    ```ruby
    logger = Logger.new('/var/log/rails.log')
    ActiveSupport::Logger.logger_outputs_to?(logger, '/var/log/rails.log')
    ```

    _Christian Schmidt_

-   Include `IPAddr#prefix` when serializing an `IPAddr` using the
    `ActiveSupport::MessagePack` serializer.

    This change is backward and forward compatible — old payloads can
    still be read, and new payloads will be readable by older versions of Rails.

    _Taiki Komaba_

-   Add `default:` support for `ActiveSupport::CurrentAttributes.attribute`.

    ```ruby
    class Current < ActiveSupport::CurrentAttributes
      attribute :counter, default: 0
    end
    ```

    _Sean Doyle_

-   Yield instance to `Object#with` block.

    ```ruby
    client.with(timeout: 5_000) do |c|
      c.get("/commits")
    end
    ```

    _Sean Doyle_

-   Use logical core count instead of physical core count to determine the
    default number of workers when parallelizing tests.

    _Jonathan Hefner_

-   Fix `Time.now/DateTime.now/Date.today` to return results in a system timezone after `#travel_to`.

    There is a bug in the current implementation of #travel_to:
    it remembers a timezone of its argument, and all stubbed methods start
    returning results in that remembered timezone. However, the expected
    behavior is to return results in a system timezone.

    _Aleksei Chernenkov_

-   Add `ErrorReported#unexpected` to report precondition violations.

    For example:

    ```ruby
    def edit
      if published?
        Rails.error.unexpected("[BUG] Attempting to edit a published article, that shouldn't be possible")
        return false
      end
      # ...
    end
    ```

    The above will raise an error in development and test, but only report the error in production.

    _Jean Boussier_

-   Make the order of read_multi and write_multi notifications for `Cache::Store#fetch_multi` operations match the order they are executed in.

    _Adam Renberg Tamm_

-   Make return values of `Cache::Store#write` consistent.

    The return value was not specified before. Now it returns `true` on a successful write,
    `nil` if there was an error talking to the cache backend, and `false` if the write failed
    for another reason (e.g. the key already exists and `unless_exist: true` was passed).

    _Sander Verdonschot_

-   Fix logged cache keys not always matching actual key used by cache action.

    _Hartley McGuire_

-   Improve error messages of `assert_changes` and `assert_no_changes`.

    `assert_changes` error messages now display objects with `.inspect` to make it easier
    to differentiate nil from empty strings, strings from symbols, etc.
    `assert_no_changes` error messages now surface the actual value.

    _pcreux_

-   Fix `#to_fs(:human_size)` to correctly work with negative numbers.

    _Earlopain_

-   Fix `BroadcastLogger#dup` so that it duplicates the logger's `broadcasts`.

    _Andrew Novoselac_

-   Fix issue where `bootstrap.rb` overwrites the `level` of a `BroadcastLogger`'s `broadcasts`.

    _Andrew Novoselac_

-   Fix compatibility with the `semantic_logger` gem.

    The `semantic_logger` gem doesn't behave exactly like stdlib logger in that
    `SemanticLogger#level` returns a Symbol while stdlib `Logger#level` returns an Integer.

    This caused the various `LogSubscriber` classes in Rails to break when assigned a
    `SemanticLogger` instance.

    _Jean Boussier_, _ojab_

-   Fix MemoryStore to prevent race conditions when incrementing or decrementing.

    _Pierre Jambet_

-   Implement `HashWithIndifferentAccess#to_proc`.

    Previously, calling `#to_proc` on `HashWithIndifferentAccess` object used inherited `#to_proc`
    method from the `Hash` class, which was not able to access values using indifferent keys.

    _fatkodima_

Please check [7-1-stable](https://github.com/rails/rails/blob/7-1-stable/activesupport/CHANGELOG.md) for previous changes.
