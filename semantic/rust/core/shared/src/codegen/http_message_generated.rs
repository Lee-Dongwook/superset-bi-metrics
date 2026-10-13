extern crate alloc;

#[derive(Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Default)]
#[repr(transparent)]
pub struct HttpCommand(pub u8);
#[allow(non_upper_case_globals)]
impl HttpCommand {
    pub const NONE: Self = Self(0);
    pub const HttpQuery: Self = Self(1);
    pub const HttpResultSet: Self = Self(2);
    pub const HttpError: Self = Self(3);
    pub const HttpQueryResult: Self = Self(4);

    pub const ENUM_MIN: u8 = 0;
    pub const ENUM_MAX: u8 = 4;
    pub const ENUM_VALUES: &'static [Self] = &[
        Self::NONE,
        Self::HttpQuery,
        Self::HttpResultSet,
        Self::HttpError,
        Self::HttpQueryResult,
    ];

    pub fn variant_name(self) -> Option<&'static str> {
        match self {
            Self::NONE => Some("NONE"),
            Self::HttpQuery => Some("HttpQuery"),
            Self::HttpResultSet => Some("HttpResultSet"),
            Self::HttpError => Some("HttpError"),
            Self::HttpQueryResult => Some("HttpQueryResult"),
            _ => None,
        }
    }
}
