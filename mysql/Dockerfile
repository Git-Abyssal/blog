FROM mysql:8.0.46@sha256:7dcddc01f13bab2f15cde676d44d01f61fc9f99fe7785e86196dfc07d358ae2b

# The blog only needs the MySQL server and client. MySQL Shell embeds an
# unrelated Python environment, while gosu is unnecessary because this image
# always runs directly as the mysql user.
RUN microdnf update -y \
    && microdnf clean all \
    && rm -rf /usr/lib/mysqlsh /usr/local/bin/gosu

USER 999:999
