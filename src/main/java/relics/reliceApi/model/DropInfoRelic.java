package relics.reliceApi.model;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@AllArgsConstructor
public class DropInfoRelic {
    private String mission;
    private String location;
    private String rotation;
    private String chance;

}
